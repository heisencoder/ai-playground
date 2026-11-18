import { describe, expect, it } from 'vitest'
import { ConfigError } from '../../src/core/errors'
import { SOURCE_ID_PROPERTY } from '../../src/core/model'
import type { FakeDrive } from '../fakes/fakeDrive'
import { DOC_MIME, ExecutionKilled, MY_DRIVE_ROOT } from '../fakes/fakeDrive'
import type { Scenario } from '../fakes/scenario'
import { buildScenario, harnessFor } from '../fakes/scenario'

/** A picture of the destination that ignores generated IDs. */
function snapshot(drive: FakeDrive, rootId: string, prefix = ''): string[] {
  const lines: string[] = []
  for (const child of drive.childrenOf(rootId)) {
    const comments = child.comments
      .map(
        (comment) =>
          `${comment.content ?? ''}|${String(comment.resolved)}|${(comment.replies ?? []).map((reply) => reply.content).join(';')}`
      )
      .sort()
    lines.push(
      `${prefix}${child.name} rev=${String(child.revisions)} comments=[${comments.join(' // ')}]`
    )
    lines.push(...snapshot(drive, child.id, `${prefix}${child.name}/`))
  }
  return lines.sort()
}

function migratedReference(): { scenario: Scenario; picture: string[] } {
  const scenario = buildScenario()
  const harness = harnessFor(scenario)
  harness.run('SCAN')
  harness.run('EXECUTE')
  return { scenario, picture: snapshot(scenario.drive, scenario.sharedDriveId) }
}

describe('pausing and resuming', () => {
  it('finishes a migration over several short runs, identical to one long run', () => {
    const reference = migratedReference()
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { minutesPerRun: '1' })
    harness.run('SCAN')
    harness.latencyMs = 9_000 // about six Drive calls per one-minute run

    const reports = harness.runToCompletion('EXECUTE')

    expect(reports.length).toBeGreaterThan(2)
    expect(snapshot(scenario.drive, scenario.sharedDriveId)).toEqual(
      reference.picture
    )
  })

  it('says how much is left and whether it will continue by itself', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { minutesPerRun: '1' })
    harness.run('SCAN')
    harness.latencyMs = 9_000

    const first = harness.run('EXECUTE')

    expect(first.complete).toBe(false)
    expect(first.continueAutomatically).toBe(true)
    expect(first.headline).toMatch(/paused with \d+ item\(s\) to go/)
    expect(first.headline).toContain('continue by itself')
    expect(harness.store.getMeta('job')).toBe('EXECUTE')
  })

  it('waits to be continued by hand when automatic continuation is off', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, {
      minutesPerRun: '1',
      autoContinue: 'No',
    })
    harness.run('SCAN')
    harness.latencyMs = 9_000

    const first = harness.run('EXECUTE')

    expect(first.continueAutomatically).toBe(false)
    expect(first.headline).toContain('Choose "Continue a paused job"')
  })

  it('stops promptly when asked, and can be continued later', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    harness.latencyMs = 6_000
    let calls = 0
    const advance = scenario.drive.onRequest
    scenario.drive.onRequest = (request) => {
      advance(request)
      calls += 1
      if (calls === 4) {
        harness.store.setMeta('stop', '1')
      }
    }

    const stopped = harness.run('EXECUTE')

    expect(stopped.complete).toBe(false)
    expect(stopped.stopped).toBe(true)
    expect(stopped.continueAutomatically).toBe(false)
    expect(stopped.headline).toContain('Stopped on request')

    const reports = [harness.run('EXECUTE', false)]
    expect(reports[0]?.complete).toBe(true)
    expect(snapshot(scenario.drive, scenario.sharedDriveId)).toEqual(
      migratedReference().picture
    )
  })

  it('does nothing when run again after finishing', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    harness.run('EXECUTE')
    const writesBefore = scenario.drive.writes().length

    const again = harness.run('EXECUTE')

    expect(again.complete).toBe(true)
    expect(scenario.drive.writes()).toHaveLength(writesBefore)
  })
})

describe('recovering from a killed execution', () => {
  const reference = migratedReference()
  const totalWrites = reference.scenario.drive.writes().length

  it('has a scenario with enough writes to be worth interrupting', () => {
    expect(totalWrites).toBeGreaterThanOrEqual(12)
  })

  // Kill the execution straight after every single write in turn: Drive has
  // made the change, but the sheet never heard about it.
  it.each(Array.from({ length: totalWrites }, (_, index) => index + 1))(
    'ends up identical, with nothing duplicated, when killed after write %i',
    (killAt) => {
      const scenario = buildScenario()
      const harness = harnessFor(scenario)
      harness.run('SCAN')
      scenario.drive.killAfterWrites = killAt

      expect(() => harness.run('EXECUTE')).toThrow(ExecutionKilled)
      harness.store.crash()
      const report = harness.run('EXECUTE', false)

      expect(report.complete).toBe(true)
      expect(snapshot(scenario.drive, scenario.sharedDriveId)).toEqual(
        reference.picture
      )
    }
  )

  it('survives being killed repeatedly', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    let finished = false
    for (let attempt = 0; attempt < 40 && !finished; attempt += 1) {
      scenario.drive.killAfterWrites = 2
      try {
        finished = harness.run('EXECUTE', attempt === 0).complete
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionKilled)
        harness.store.crash()
      }
    }

    expect(finished).toBe(true)
    expect(snapshot(scenario.drive, scenario.sharedDriveId)).toEqual(
      reference.picture
    )
  })

  it('does not duplicate anything if the sheet is lost and the job redone', () => {
    const scenario = buildScenario()
    harnessFor(scenario).runToCompletion('SCAN')
    const first = harnessFor(scenario)
    first.run('SCAN')
    first.run('EXECUTE')
    const before = snapshot(scenario.drive, scenario.sharedDriveId)

    const second = harnessFor(scenario) // a brand new, empty store
    second.run('SCAN')
    const report = second.run('EXECUTE')

    expect(report.complete).toBe(true)
    expect(snapshot(scenario.drive, scenario.sharedDriveId)).toEqual(before)
    expect(second.store.at('Team Files/Budget/Notes').result).toContain(
      'copied'
    )
  })
})

describe('failures', () => {
  it('retries rate limits with exponential backoff', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    scenario.drive.failNext(
      'PATCH',
      /^\/files\//,
      403,
      'userRateLimitExceeded',
      2
    )

    const report = harness.run('EXECUTE')

    expect(report.headline).toContain('3 moved')
    expect(report.headline).toContain('0 failed')
    expect(harness.sleeps).toEqual([1000, 2000])
  })

  it('marks one file FAILED and carries on with the rest', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    scenario.drive.failNext('POST', /\/copy$/, 500, 'backendError')

    const report = harness.run('EXECUTE')

    expect(report.complete).toBe(true)
    expect(report.headline).toContain('1 failed')
    const statuses = Object.values(harness.store.statuses())
    expect(statuses.filter((status) => status === 'FAILED')).toHaveLength(1)
    expect(statuses.filter((status) => status === 'DONE')).toHaveLength(9)
    expect(harness.store.logs.some((log) => log.level === 'ERROR')).toBe(true)
  })

  it('retries FAILED rows the next time Migrate is chosen', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    scenario.drive.failNext('POST', /\/copy$/, 500, 'backendError')
    harness.run('EXECUTE')

    const again = harness.run('EXECUTE')

    expect(again.headline).toContain('1 copied')
    expect(Object.values(harness.store.statuses())).not.toContain('FAILED')
    expect(snapshot(scenario.drive, scenario.sharedDriveId)).toEqual(
      migratedReference().picture
    )
  })

  it('blocks the contents of a folder that could not be created', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { createRootFolder: 'No' })
    harness.run('SCAN')
    scenario.drive.failNext(
      'POST',
      /^\/files$/,
      403,
      'teamDriveFileLimitExceeded'
    )

    harness.run('EXECUTE')

    expect(harness.store.at('Team Files').status).toBe('DONE')
    expect(harness.store.at('Team Files/Archive').status).toBe('FAILED')
    expect(harness.store.at('Team Files/Archive/Old plan').status).toBe(
      'BLOCKED'
    )
    expect(scenario.drive.file(scenario.ids.oldPlan).driveId).toBe('')
  })

  it('reports a refused move of an own file and leaves it where it is', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    scenario.drive.refuseMove(
      scenario.ids.roadmap,
      'fileOwnerNotMemberOfTeamDrive'
    )

    harness.run('EXECUTE')

    const row = harness.store.at('Team Files/Roadmap')
    expect(row.status).toBe('FAILED')
    expect(row.result).toBe('move refused (fileOwnerNotMemberOfTeamDrive)')
    expect(scenario.drive.file(scenario.ids.roadmap).driveId).toBe('')
  })

  it('copies instead when a refused move is configured to fall back', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { moveRefused: 'COPY' })
    harness.run('SCAN')
    scenario.drive.refuseMove(scenario.ids.roadmap)

    harness.run('EXECUTE')

    const row = harness.store.at('Team Files/Roadmap')
    expect(row.status).toBe('DONE')
    expect(row.result).toMatch(
      /^move refused \(insufficientFilePermissions\); copied/
    )
    expect(row.destId).not.toBe(scenario.ids.roadmap)
    expect(scenario.drive.file(row.destId).properties[SOURCE_ID_PROPERTY]).toBe(
      scenario.ids.roadmap
    )
  })

  it('rejects a source that changed after the scan', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    const other = scenario.drive.addFolder('Other', MY_DRIVE_ROOT)
    harness.configure({ sourceId: other })

    expect(() => harness.run('EXECUTE')).toThrow(ConfigError)
    expect(scenario.drive.writes()).toEqual([])
  })
})

describe('preflight', () => {
  it.each([
    [
      'a source that does not exist',
      { sourceId: 'no-such-folder-id' },
      /Source folder not found/,
    ],
    [
      'a destination that does not exist',
      { destinationId: 'no-such-drive-id' },
      /Destination not found/,
    ],
    [
      'the same source and destination',
      { destinationId: 'SAME' },
      /same folder/,
    ],
  ])('refuses %s', (_name, config, message) => {
    const scenario = buildScenario()
    const fixed = Object.fromEntries(
      Object.entries(config).map(([key, value]) => [
        key,
        value === 'SAME' ? scenario.sourceId : value,
      ])
    )
    const harness = harnessFor(scenario, fixed)

    expect(() => harness.run('SCAN')).toThrow(message)
  })

  it('refuses a source that is a file', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { sourceId: scenario.ids.roadmap })

    expect(() => harness.run('SCAN')).toThrow('The source must be a folder.')
  })

  it('refuses a source that is already in a shared drive', () => {
    const scenario = buildScenario()
    const inside = scenario.drive.addFolder('Inside', scenario.sharedDriveId)
    const other = scenario.drive.addSharedDrive('Other drive')
    const harness = harnessFor(scenario, {
      sourceId: inside,
      destinationId: other,
    })

    expect(() => harness.run('SCAN')).toThrow(/already in a shared drive/)
  })

  it('refuses a destination in My Drive', () => {
    const scenario = buildScenario()
    const mine = scenario.drive.addFolder('Mine', MY_DRIVE_ROOT)
    const harness = harnessFor(scenario, { destinationId: mine })

    expect(() => harness.run('SCAN')).toThrow(/must be a shared drive/)
  })

  it('refuses a shared drive the account cannot add files to', () => {
    const scenario = buildScenario()
    const readOnly = scenario.drive.addSharedDrive('Read only', false)
    const harness = harnessFor(scenario, { destinationId: readOnly })

    expect(() => harness.run('SCAN')).toThrow(
      /me@example.com cannot add files to "Read only"/
    )
  })

  it('reads the source and destination from pasted URLs', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, {
      sourceId: `https://drive.google.com/drive/folders/${scenario.sourceId}?usp=sharing`,
      destinationId: `https://drive.google.com/drive/u/0/folders/${scenario.sharedDriveId}`,
    })

    expect(harness.run('SCAN').complete).toBe(true)
  })
})

describe('odd trees', () => {
  it('keeps two files with the same name in one folder', () => {
    const scenario = buildScenario()
    scenario.drive.addFile('Roadmap', scenario.sourceId, DOC_MIME)
    const harness = harnessFor(scenario, { createRootFolder: 'No' })
    harness.run('SCAN')

    harness.run('EXECUTE')

    const names = scenario.drive
      .childrenOf(scenario.sharedDriveId)
      .map((file) => file.name)
    expect(names.filter((name) => name === 'Roadmap')).toHaveLength(2)
  })

  it('keeps two folders with the same name apart', () => {
    const scenario = buildScenario()
    const twin = scenario.drive.addFolder('Archive', scenario.sourceId)
    scenario.drive.addFile('Twin file', twin, DOC_MIME)
    const harness = harnessFor(scenario, { createRootFolder: 'No' })
    harness.run('SCAN')

    harness.run('EXECUTE')

    const archives = scenario.drive
      .childrenOf(scenario.sharedDriveId)
      .filter((file) => file.name === 'Archive')
    expect(archives).toHaveLength(2)
    expect(
      archives
        .map((folder) => scenario.drive.childrenOf(folder.id).length)
        .sort()
    ).toEqual([1, 2])
  })

  it('records a file that sits in two folders only once', () => {
    const scenario = buildScenario()
    scenario.drive
      .file(scenario.ids.oldPlan)
      .parents.push(scenario.ids.budgetFolder)
    const harness = harnessFor(scenario)

    harness.run('SCAN')

    const rows = harness.store
      .readItems()
      .filter((item) => item.id === scenario.ids.oldPlan)
    expect(rows).toHaveLength(1)
    expect(harness.store.logs.some((log) => log.level === 'WARN')).toBe(true)
  })

  it('pages through a folder with more children than one listing returns', () => {
    const scenario = buildScenario()
    const big = scenario.drive.addFolder('Big', scenario.sourceId)
    for (let index = 0; index < 25; index += 1) {
      scenario.drive.addFile(`File ${String(index).padStart(2, '0')}`, big)
    }
    scenario.drive.maxPageSize = 10
    const harness = harnessFor(scenario)

    harness.run('SCAN')
    harness.run('EXECUTE')

    const destBig = harness.store.at('Team Files/Big').destId
    expect(scenario.drive.childrenOf(destBig)).toHaveLength(25)
  })
})

describe('things that change between scan and migrate', () => {
  it('does not copy twice when Drive did the copy but reported an error', () => {
    const reference = migratedReference()
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    scenario.drive.failNextAfterApplying('POST', /\/copy$/)

    const first = harness.run('EXECUTE')
    expect(first.headline).toContain('1 failed')
    harness.run('EXECUTE')

    expect(Object.values(harness.store.statuses())).not.toContain('FAILED')
    expect(snapshot(scenario.drive, scenario.sharedDriveId)).toEqual(
      reference.picture
    )
  })

  it('does not create a folder twice when Drive created it but reported an error', () => {
    const reference = migratedReference()
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    scenario.drive.failNextAfterApplying('POST', /^\/files$/)

    harness.run('EXECUTE')
    harness.run('EXECUTE')

    expect(snapshot(scenario.drive, scenario.sharedDriveId)).toEqual(
      reference.picture
    )
  })

  it('refuses a changed Destination once part of the tree has gone to the old one', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { pathFilter: 'Team Files/Budget' })
    harness.run('SCAN')
    harness.run('EXECUTE')
    const elsewhere = scenario.drive.addSharedDrive('The real drive')
    harness.configure({ destinationId: elsewhere, pathFilter: '' })
    const writes = scenario.drive.writes().length

    expect(() => harness.run('EXECUTE')).toThrow(/Destination has changed/)
    expect(scenario.drive.writes()).toHaveLength(writes)
    expect(scenario.drive.tree(elsewhere)).toEqual([])
  })

  it('accepts a changed Destination when nothing has been migrated yet', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    harness.run('DRY_RUN')
    const elsewhere = scenario.drive.addSharedDrive('The real drive')
    harness.configure({ destinationId: elsewhere })

    harness.run('EXECUTE')

    expect(scenario.drive.tree(elsewhere)).toContain('Team Files/Roadmap')
    expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual([])
  })

  it('will not put files into a destination folder that has been deleted', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { pathFilter: 'Team Files/Archive' })
    harness.run('SCAN')
    harness.run('EXECUTE')
    scenario.drive.files.delete(harness.store.at('Team Files').destId)
    harness.configure({ pathFilter: '' })

    harness.run('EXECUTE')

    expect(harness.store.at('Team Files/Roadmap').result).toContain(
      'destination folder no longer exists'
    )
  })

  it('will not put files into a destination folder that has been trashed', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { pathFilter: 'Team Files/Archive' })
    harness.run('SCAN')
    harness.run('EXECUTE')
    scenario.drive.file(harness.store.at('Team Files').destId).trashed = true
    harness.configure({ pathFilter: '' })

    harness.run('EXECUTE')

    const roadmap = harness.store.at('Team Files/Roadmap')
    expect(roadmap.status).toBe('BLOCKED')
    expect(roadmap.result).toContain('destination folder is in the trash')
    expect(scenario.drive.file(scenario.ids.roadmap).driveId).toBe('')
  })

  it('leaves alone a file that was moved somewhere else after the scan', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    const elsewhere = scenario.drive.addFolder('Private', MY_DRIVE_ROOT)
    scenario.drive.file(scenario.ids.roadmap).parents = [elsewhere]

    harness.run('EXECUTE')

    const row = harness.store.at('Team Files/Roadmap')
    expect(row.status).toBe('FAILED')
    expect(row.result).toContain('no longer in the folder it was scanned in')
    expect(scenario.drive.file(scenario.ids.roadmap).parents).toEqual([
      elsewhere,
    ])
  })

  it('skips a file that was trashed after the scan', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    scenario.drive.file(scenario.ids.roadmap).trashed = true

    harness.run('EXECUTE')

    const row = harness.store.at('Team Files/Roadmap')
    expect(row.status).toBe('SKIPPED')
    expect(row.result).toBe('in the trash since the scan')
    expect(scenario.drive.file(scenario.ids.roadmap).driveId).toBe('')
  })

  it('moves a file that sits in two folders, removing both old parents', () => {
    const scenario = buildScenario()
    scenario.drive
      .file(scenario.ids.oldPlan)
      .parents.push(scenario.ids.budgetFolder)
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    harness.run('EXECUTE')

    const file = scenario.drive.file(scenario.ids.oldPlan)
    expect(file.parents).toHaveLength(1)
    expect(file.driveId).toBe(scenario.sharedDriveId)
  })

  it('does not fall back to a copy when the move failed for lack of room', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { moveRefused: 'COPY' })
    harness.run('SCAN')
    scenario.drive.refuseMove(
      scenario.ids.roadmap,
      'teamDriveFileLimitExceeded'
    )

    harness.run('EXECUTE')

    const row = harness.store.at('Team Files/Roadmap')
    expect(row.status).toBe('FAILED')
    expect(row.result).toContain('teamDriveFileLimitExceeded')
    expect(row.destId).toBe('')
  })
})

describe('who and what a job belongs to', () => {
  it('refuses to run a plan scanned by a different account', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    harness.store.setMeta('user', 'someone.else@example.com')

    expect(() => harness.run('EXECUTE')).toThrow(
      /scanned by someone.else@example.com, but you are me@example.com/
    )
    expect(() => harness.run('EXECUTE', false)).toThrow(ConfigError)
    expect(scenario.drive.writes()).toEqual([])
  })

  it('does not leave a refused job behind for Continue to resume', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    const other = scenario.drive.addFolder('Other', MY_DRIVE_ROOT)
    harness.configure({ sourceId: other })

    expect(() => harness.run('EXECUTE')).toThrow(ConfigError)

    expect(harness.store.getMeta('job')).toBe('')
  })

  it('obeys a Stop that arrived before the trigger fired', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { minutesPerRun: '1' })
    harness.run('SCAN')
    harness.latencyMs = 9_000
    harness.run('EXECUTE')
    const writes = scenario.drive.writes().length
    harness.store.setMeta('stop', '1')

    const report = harness.runAs('EXECUTE', 'TRIGGER')

    expect(report.stopped).toBe(true)
    expect(report.continueAutomatically).toBe(false)
    expect(scenario.drive.writes()).toHaveLength(writes)
    // A person choosing Continue lifts the stop.
    expect(harness.run('EXECUTE', false).complete).toBe(false)
    expect(scenario.drive.writes().length).toBeGreaterThan(writes)
  })

  it('keeps Override values when the folder is scanned again', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    harness.store.override('Team Files/Roadmap', 'SKIP')
    harness.store.override('Team Files/Shared spec', 'SHORTCUT')
    harness.run('SCAN')
    expect(harness.store.at('Team Files/Roadmap').override).toBe('SKIP')

    harness.store.override('Team Files/Shared spec', '')
    harness.run('SCAN')
    harness.run('EXECUTE')

    expect(harness.store.at('Team Files/Roadmap').status).toBe('SKIPPED')
    expect(harness.store.at('Team Files/Shared spec').override).toBe('')
    expect(scenario.drive.file(scenario.ids.roadmap).driveId).toBe('')
  })
})

describe('a folder the scan could not list', () => {
  it('is reported even when the failure happened in an earlier run of the scan', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { minutesPerRun: '1' })
    harness.latencyMs = 25_000
    // The source folder lists fine; the first sub-folder does not.
    scenario.drive.failListing(2)
    harness.runAs('SCAN', 'FRESH')

    const reports = [harness.run('SCAN', false)]
    while (reports.at(-1)?.complete !== true) {
      reports.push(harness.run('SCAN', false))
    }

    expect(reports.length).toBeGreaterThan(1)
    expect(reports[0]?.complete).toBe(false)
    expect(reports.at(-1)?.headline).toContain(
      'WARNING: 1 folder(s) could not be listed'
    )
    const unlisted = harness.store
      .readItems()
      .filter((item) => item.scanState === 'ERROR')
    expect(unlisted).toHaveLength(1)
  })

  it('is not passed off as migrated', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    scenario.drive.failListing(2)
    harness.run('SCAN')

    harness.run('DRY_RUN')
    harness.run('EXECUTE')

    const unlisted = harness.store
      .readItems()
      .filter((item) => item.scanState === 'ERROR')
    expect(unlisted.length).toBeGreaterThan(0)
    for (const folder of unlisted) {
      expect(folder.status).toBe('FAILED')
      expect(folder.result).toContain('could not be listed during the scan')
      expect(folder.dryRun).toContain('error: its contents could not be listed')
    }
  })
})

describe('recovering when a planned move had fallen back to a copy', () => {
  const config = { tryMoveOthersFiles: 'Yes' } as const
  const reference = ((): string[] => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, config)
    harness.run('SCAN')
    harness.run('EXECUTE')
    return snapshot(scenario.drive, scenario.sharedDriveId)
  })()

  it.each(Array.from({ length: 13 }, (_, index) => index + 1))(
    'still carries the comments over when killed after write %i',
    (killAt) => {
      const scenario = buildScenario()
      const harness = harnessFor(scenario, config)
      harness.run('SCAN')
      scenario.drive.killAfterWrites = killAt

      try {
        harness.run('EXECUTE')
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionKilled)
        harness.store.crash()
      }
      harness.run('EXECUTE', false)

      expect(snapshot(scenario.drive, scenario.sharedDriveId)).toEqual(
        reference
      )
    }
  )
})
