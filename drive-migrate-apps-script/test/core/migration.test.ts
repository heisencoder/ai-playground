import { describe, expect, it } from 'vitest'
import { DisallowedOperationError } from '../../src/core/errors'
import { FOLDER_MIME, SOURCE_ID_PROPERTY } from '../../src/core/model'
import { COMMENT_BANNER } from '../../src/core/comments'
import { ME } from '../fakes/fakeDrive'
import { buildScenario, harnessFor } from '../fakes/scenario'

describe('scan and plan', () => {
  it('inventories the whole tree and classifies every item', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)

    const report = harness.run('SCAN')

    expect(report.complete).toBe(true)
    const actions = Object.fromEntries(
      harness.store.readItems().map((item) => [item.path, item.action])
    )
    expect(actions).toEqual({
      'Team Files': 'CREATE_FOLDER',
      'Team Files/Archive': 'CREATE_FOLDER',
      'Team Files/Budget': 'CREATE_FOLDER',
      'Team Files/Roadmap': 'MOVE',
      'Team Files/Shared spec': 'COPY',
      'Team Files/Shortcut to Notes': 'SHORTCUT',
      'Team Files/Archive/Empty': 'CREATE_FOLDER',
      'Team Files/Archive/Office map': 'SKIP',
      'Team Files/Archive/Old plan': 'MOVE',
      'Team Files/Budget/2024 Budget': 'MOVE',
      'Team Files/Budget/Locked report': 'SKIP',
      'Team Files/Budget/Notes': 'COPY',
    })
    expect(report.headline).toContain('3 to move, 2 to copy')
    expect(
      harness.store.at('Team Files/Budget/Locked report').reason
    ).toContain('copying is disabled')
  })

  it('changes nothing in Drive', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)

    harness.run('SCAN')

    expect(scenario.drive.writes()).toEqual([])
  })

  it('pauses when time runs out and resumes without duplicates', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { minutesPerRun: '1' })
    harness.latencyMs = 25_000 // two or three listings per one-minute run

    const reports = harness.runToCompletion('SCAN')

    expect(reports.length).toBeGreaterThan(1)
    expect(reports[0]?.continueAutomatically).toBe(true)
    const paths = harness.store.readItems().map((item) => item.path)
    expect(paths).toHaveLength(12)
    expect(new Set(paths).size).toBe(12)
  })

  it('records a folder that cannot be listed and carries on', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    scenario.drive.failNext('GET', /^\/files$/, 404, 'notFound')

    const report = harness.run('SCAN')

    expect(report.complete).toBe(true)
    expect(report.headline).toContain('1 folder(s) could not be listed')
    expect(harness.store.logs.some((log) => log.level === 'ERROR')).toBe(true)
  })
})

describe('dry run', () => {
  it('reports what would happen without changing Drive or any status', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    const before = harness.store.statuses()

    const report = harness.run('DRY_RUN')

    expect(report.complete).toBe(true)
    expect(scenario.drive.writes()).toEqual([])
    expect(harness.store.statuses()).toEqual(before)
    expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual([])
    const dry = (path: string): string => harness.store.at(path).dryRun
    expect(dry('Team Files')).toBe('would create folder')
    expect(dry('Team Files/Roadmap')).toContain('would move')
    expect(dry('Team Files/Budget/Notes')).toContain('would copy')
    expect(dry('Team Files/Archive/Office map')).toContain('would skip')
    expect(dry('Team Files/Shortcut to Notes')).toBe('would recreate shortcut')
    expect(report.headline).toContain('would be: 3 moved, 2 copied')
  })

  it('uses a client that cannot write, so a bug could not change Drive', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)

    expect(() =>
      harness.client(true).createFolder('x', scenario.sharedDriveId, 'src')
    ).toThrow(DisallowedOperationError)
    expect(scenario.drive.requests).toEqual([])
  })

  it('can be repeated and reflects overrides typed since the last one', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    harness.run('DRY_RUN')

    harness.store.override('Team Files/Roadmap', 'SKIP')
    harness.run('DRY_RUN')

    expect(harness.store.at('Team Files/Roadmap').dryRun).toBe(
      'would skip: skipped by override'
    )
  })

  it('needs a finished scan first', () => {
    const harness = harnessFor(buildScenario())

    expect(() => harness.run('DRY_RUN')).toThrow(/Scan and plan/)
  })
})

describe('migrate', () => {
  it('recreates the folder tree and moves, copies or skips each file', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    const report = harness.run('EXECUTE')

    expect(report.complete).toBe(true)
    expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual([
      'Team Files/',
      'Team Files/Archive/',
      'Team Files/Archive/Empty/',
      'Team Files/Archive/Old plan',
      'Team Files/Budget/',
      'Team Files/Budget/2024 Budget',
      'Team Files/Budget/Notes',
      'Team Files/Roadmap',
      'Team Files/Shared spec',
      'Team Files/Shortcut to Notes',
    ])
    expect(report.headline).toContain(
      '3 moved, 2 copied, 1 shortcut(s), 4 folder(s), 2 skipped, 0 failed'
    )
  })

  it('moves owned files: same ID, revision history and comments intact', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    harness.run('EXECUTE')

    const roadmap = scenario.drive.file(scenario.ids.roadmap)
    expect(roadmap.driveId).toBe(scenario.sharedDriveId)
    expect(roadmap.revisions).toBe(30)
    expect(roadmap.comments).toHaveLength(2)
    expect(roadmap.comments[0]?.author?.displayName).toBe('Alice Author')
    expect(harness.store.at('Team Files/Roadmap').destId).toBe(
      scenario.ids.roadmap
    )
  })

  it('copies files owned by others and leaves the original untouched', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    harness.run('EXECUTE')

    const original = scenario.drive.file(scenario.ids.notes)
    expect(original.parents).toEqual([scenario.ids.budgetFolder])
    expect(original.ownerEmail).toBe('carol@other.example')
    const row = harness.store.at('Team Files/Budget/Notes')
    const copy = scenario.drive.file(row.destId)
    expect(copy.id).not.toBe(original.id)
    expect(copy.revisions).toBe(1)
    expect(copy.properties[SOURCE_ID_PROPERTY]).toBe(original.id)
    expect(copy.description).toContain(
      'Original owner: Carol <carol@other.example>'
    )
    expect(copy.description).toContain(`/d/${original.id}/`)
  })

  it('carries comments onto copies: open ones natively, resolved as text', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    harness.run('EXECUTE')

    const row = harness.store.at('Team Files/Budget/Notes')
    const comments = scenario.drive.file(row.destId).comments
    expect(comments).toHaveLength(3)
    const native = comments.filter(
      (comment) => !(comment.content ?? '').startsWith(COMMENT_BANNER)
    )
    expect(native.map((comment) => comment.content)).toEqual([
      'Is this still current?',
      'Add the vendor list',
    ])
    const reposted = comments.find((comment) =>
      (comment.content ?? '').startsWith(COMMENT_BANNER)
    )
    expect(reposted?.content).toBe(
      `${COMMENT_BANNER} Dave - 2024-03-01\n> Bugdet\nTypo in heading`
    )
    expect(reposted?.resolved).toBe(true)
    expect(reposted?.author?.displayName).toBe(ME.displayName)
    expect(row.result).toBe(
      'copied; 3 comment thread(s), 2 copied natively, 1 re-posted as text'
    )
  })

  it('never deletes, trashes or re-shares anything', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    const before = scenario.drive.files.size
    harness.run('SCAN')

    harness.run('EXECUTE')

    expect(
      [...scenario.drive.files.values()].filter((file) => file.trashed)
    ).toEqual([])
    expect(scenario.drive.files.size).toBeGreaterThan(before)
    const methods = new Set(scenario.drive.requests.map((r) => r.method))
    expect([...methods].sort()).toEqual(['GET', 'PATCH', 'POST'])
  })

  it('leaves the source folders in place as an audit trail', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    harness.run('EXECUTE')

    expect(scenario.drive.tree(scenario.sourceId)).toEqual([
      'Archive/',
      'Archive/Empty/',
      'Archive/Office map',
      'Budget/',
      'Budget/Locked report',
      'Budget/Notes',
      'Shared spec',
      'Shortcut to Notes',
    ])
  })

  it('points a recreated shortcut at the copy of its target', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    harness.run('EXECUTE')

    const copyId = harness.store.at('Team Files/Budget/Notes').destId
    const shortcut = scenario.drive.file(
      harness.store.at('Team Files/Shortcut to Notes').destId
    )
    expect(shortcut.shortcutTargetId).toBe(copyId)
  })

  it('merges straight into the destination when no top-level folder is wanted', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { createRootFolder: 'No' })
    harness.run('SCAN')

    harness.run('EXECUTE')

    expect(scenario.drive.tree(scenario.sharedDriveId)).toContain('Roadmap')
    expect(scenario.drive.tree(scenario.sharedDriveId)).toContain(
      'Budget/2024 Budget'
    )
  })

  it('accepts a folder inside the shared drive as the destination', () => {
    const scenario = buildScenario()
    const inbox = scenario.drive.addFolder('Inbox', scenario.sharedDriveId)
    const harness = harnessFor(scenario, { destinationId: inbox })
    harness.run('SCAN')

    harness.run('EXECUTE')

    expect(scenario.drive.tree(scenario.sharedDriveId)).toContain(
      'Inbox/Team Files/Roadmap'
    )
  })

  it('creates every folder as a new folder (none is moved)', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    harness.run('EXECUTE')

    const row = harness.store.at('Team Files/Budget')
    expect(row.destId).not.toBe(scenario.ids.budgetFolder)
    expect(scenario.drive.file(row.destId).mimeType).toBe(FOLDER_MIME)
    expect(scenario.drive.file(scenario.ids.budgetFolder).driveId).toBe('')
  })
})
