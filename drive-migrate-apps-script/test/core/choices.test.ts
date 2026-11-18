import { describe, expect, it } from 'vitest'
import { SHORTCUT_MIME } from '../../src/core/model'
import { COMMENT_BANNER, REPLY_BANNER } from '../../src/core/comments'
import { DOC_MIME, PDF_MIME } from '../fakes/fakeDrive'
import { buildScenario, harnessFor } from '../fakes/scenario'

describe("files the account doesn't own", () => {
  it('can be left behind with a shortcut to the original', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { othersFiles: 'SHORTCUT' })
    harness.run('SCAN')

    harness.run('EXECUTE')

    const row = harness.store.at('Team Files/Budget/Notes')
    const shortcut = scenario.drive.file(row.destId)
    expect(shortcut.mimeType).toBe(SHORTCUT_MIME)
    expect(shortcut.shortcutTargetId).toBe(scenario.ids.notes)
    expect(row.result).toBe('shortcut to the original created')
    // Even an uncopyable file can be linked to.
    expect(harness.store.at('Team Files/Budget/Locked report').status).toBe(
      'DONE'
    )
  })

  it('can be skipped', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { othersFiles: 'SKIP' })
    harness.run('SCAN')

    const report = harness.run('EXECUTE')

    expect(harness.store.at('Team Files/Budget/Notes').status).toBe('SKIPPED')
    expect(report.headline).toContain('0 copied')
  })

  it('are really moved, history and all, when the admin allows editors to', () => {
    const scenario = buildScenario()
    scenario.drive.editorsMayMove = true
    const harness = harnessFor(scenario, { tryMoveOthersFiles: 'Yes' })
    harness.run('SCAN')
    expect(harness.store.at('Team Files/Budget/Notes').action).toBe('MOVE')

    harness.run('EXECUTE')

    const notes = scenario.drive.file(scenario.ids.notes)
    expect(notes.driveId).toBe(scenario.sharedDriveId)
    expect(notes.revisions).toBe(7)
    expect(notes.comments).toHaveLength(3)
    expect(harness.store.at('Team Files/Budget/Notes').result).toBe('moved')
  })

  it('fall back to a copy when the attempted move is refused', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { tryMoveOthersFiles: 'Yes' })
    harness.run('SCAN')

    harness.run('DRY_RUN')
    expect(harness.store.at('Team Files/Budget/Notes').dryRun).toBe(
      'would try to move; if refused: COPY'
    )
    harness.run('EXECUTE')

    const row = harness.store.at('Team Files/Budget/Notes')
    expect(row.status).toBe('DONE')
    expect(row.result).toMatch(
      /^move refused \(fileWriterTeamDriveMoveInDisabled\); copied/
    )
    expect(scenario.drive.file(scenario.ids.notes).driveId).toBe('')
    // The uncopyable one cannot fall back to anything.
    const locked = harness.store.at('Team Files/Budget/Locked report')
    expect(locked.status).toBe('SKIPPED')
    expect(locked.result).toContain('copying is disabled')
  })
})

describe('the Override column', () => {
  it('skips a folder and everything in it', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    harness.store.override('Team Files/Budget', 'SKIP')

    harness.run('EXECUTE')

    expect(harness.store.at('Team Files/Budget').status).toBe('SKIPPED')
    const child = harness.store.at('Team Files/Budget/2024 Budget')
    expect(child.status).toBe('SKIPPED')
    expect(child.result).toBe('the parent folder was skipped')
    expect(scenario.drive.file(scenario.ids.budget).driveId).toBe('')
  })

  it('copies an own file instead of moving it, leaving the original', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    harness.store.override('Team Files/Roadmap', 'COPY')

    harness.run('EXECUTE')

    expect(scenario.drive.file(scenario.ids.roadmap).driveId).toBe('')
    expect(harness.store.at('Team Files/Roadmap').destId).not.toBe(
      scenario.ids.roadmap
    )
  })

  it('does not fall back when a file was explicitly set to MOVE', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    harness.store.override('Team Files/Shared spec', 'MOVE')

    harness.run('EXECUTE')

    const row = harness.store.at('Team Files/Shared spec')
    expect(row.status).toBe('FAILED')
    expect(row.result).toContain('move refused')
  })

  it.each([
    ['Team Files/Budget', 'MOVE', 'a folder can only be CREATE_FOLDER or SKIP'],
    ['Team Files/Roadmap', 'CREATE_FOLDER', 'a file cannot be CREATE_FOLDER'],
    ['Team Files/Budget/Locked report', 'COPY', 'copying is disabled'],
  ] as const)('explains why %s cannot be %s', (path, override, message) => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    harness.store.override(path, override)

    harness.run('DRY_RUN')
    harness.run('EXECUTE')

    expect(harness.store.at(path).dryRun).toContain(`error: Override: `)
    expect(harness.store.at(path).status).toBe('FAILED')
    expect(harness.store.at(path).result).toContain(message)
  })

  it('is honoured when changed after a row was skipped', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    harness.store.override('Team Files/Roadmap', 'SKIP')
    harness.run('EXECUTE')
    expect(harness.store.at('Team Files/Roadmap').status).toBe('SKIPPED')

    harness.store.override('Team Files/Roadmap', '')
    harness.run('EXECUTE')

    expect(harness.store.at('Team Files/Roadmap').status).toBe('DONE')
    expect(scenario.drive.file(scenario.ids.roadmap).driveId).toBe(
      scenario.sharedDriveId
    )
  })
})

describe('migrating one subtree first', () => {
  it('touches only that path and the folders leading to it', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { pathFilter: '/Team Files/Budget/' })
    harness.run('SCAN')

    harness.run('DRY_RUN')
    const report = harness.run('EXECUTE')

    expect(report.complete).toBe(true)
    expect(scenario.drive.tree(scenario.sharedDriveId)).toEqual([
      'Team Files/',
      'Team Files/Budget/',
      'Team Files/Budget/2024 Budget',
      'Team Files/Budget/Notes',
    ])
    expect(harness.store.at('Team Files/Roadmap').status).toBe('PENDING')
    expect(harness.store.at('Team Files/Roadmap').dryRun).toBe('')
  })

  it('finishes the rest afterwards without repeating the subtree', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { pathFilter: 'Team Files/Budget' })
    harness.run('SCAN')
    harness.run('EXECUTE')
    const copyId = harness.store.at('Team Files/Budget/Notes').destId

    harness.configure({ pathFilter: '' })
    const report = harness.run('EXECUTE')

    expect(report.complete).toBe(true)
    expect(harness.store.at('Team Files/Budget/Notes').destId).toBe(copyId)
    expect(scenario.drive.tree(scenario.sharedDriveId)).toHaveLength(10)
  })
})

describe('a destination that already has content', () => {
  it('merges into a folder of the same name', () => {
    const scenario = buildScenario()
    const existing = scenario.drive.addFolder(
      'Team Files',
      scenario.sharedDriveId
    )
    scenario.drive.addFile('Already here', existing, PDF_MIME)
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    harness.run('DRY_RUN')
    expect(harness.store.at('Team Files').dryRun).toBe(
      'would merge into an existing folder'
    )
    harness.run('EXECUTE')

    expect(harness.store.at('Team Files').destId).toBe(existing)
    expect(harness.store.at('Team Files').result).toBe(
      'merged into an existing folder'
    )
    expect(scenario.drive.childrenOf(scenario.sharedDriveId)).toHaveLength(1)
    expect(scenario.drive.tree(existing)).toContain('Already here')
    expect(scenario.drive.tree(existing)).toContain('Roadmap')
  })

  it('skips a file whose name is already taken, in dry run and for real', () => {
    const scenario = buildScenario()
    const existing = scenario.drive.addFolder(
      'Team Files',
      scenario.sharedDriveId
    )
    scenario.drive.addFile('Roadmap', existing, DOC_MIME)
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    harness.run('DRY_RUN')
    harness.run('EXECUTE')

    const row = harness.store.at('Team Files/Roadmap')
    expect(row.dryRun).toContain('would skip: a file with the same name')
    expect(row.status).toBe('SKIPPED')
    expect(scenario.drive.file(scenario.ids.roadmap).driveId).toBe('')
  })

  it('adds it anyway when duplicate names are allowed', () => {
    const scenario = buildScenario()
    const existing = scenario.drive.addFolder(
      'Team Files',
      scenario.sharedDriveId
    )
    scenario.drive.addFile('Roadmap', existing, DOC_MIME)
    const harness = harnessFor(scenario, { allowDuplicateNames: 'Yes' })
    harness.run('SCAN')

    harness.run('EXECUTE')

    expect(harness.store.at('Team Files/Roadmap').status).toBe('DONE')
    expect(
      scenario.drive.childrenOf(existing).filter((f) => f.name === 'Roadmap')
    ).toHaveLength(2)
  })
})

describe('comments on copies', () => {
  it('are all re-posted as text when Drive does not copy them natively', () => {
    const scenario = buildScenario()
    const pdf = scenario.drive.addFile(
      'Scan.pdf',
      scenario.sourceId,
      PDF_MIME,
      {
        owner: { emailAddress: 'carol@other.example', displayName: 'Carol' },
      }
    )
    scenario.drive.addComment(pdf, 'Page 2 is upside down', {
      replies: [{ content: 'Fixed in the next scan', author: 'Erin' }],
    })
    scenario.drive.addComment(pdf, 'Signed?', { resolved: true })
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    harness.run('EXECUTE')

    const row = harness.store.at('Team Files/Scan.pdf')
    const comments = scenario.drive.file(row.destId).comments
    expect(comments.map((comment) => comment.content)).toEqual([
      `${COMMENT_BANNER} Alice Author - 2024-03-01\nPage 2 is upside down`,
      `${COMMENT_BANNER} Alice Author - 2024-03-01\nSigned?`,
    ])
    expect(comments[0]?.replies?.map((reply) => reply.content)).toEqual([
      `${REPLY_BANNER} Erin - 2024-03-02\nFixed in the next scan`,
    ])
    expect(comments[0]?.resolved).toBe(false)
    expect(comments[1]?.resolved).toBe(true)
    expect(row.result).toBe('copied; 2 comment thread(s), 2 re-posted as text')
  })

  it('can be switched off', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { copyComments: 'No' })
    harness.run('SCAN')

    harness.run('EXECUTE')

    const row = harness.store.at('Team Files/Budget/Notes')
    expect(scenario.drive.file(row.destId).comments).toEqual([])
    expect(row.result).toBe('copied')
  })

  it('pause part-way through a long thread list and pick up where they stopped', () => {
    const scenario = buildScenario()
    const pdf = scenario.drive.addFile(
      'Busy.pdf',
      scenario.sourceId,
      PDF_MIME,
      {
        owner: { emailAddress: 'carol@other.example', displayName: 'Carol' },
      }
    )
    for (let index = 0; index < 30; index += 1) {
      scenario.drive.addComment(pdf, `Remark ${String(index)}`)
    }
    const harness = harnessFor(scenario, { minutesPerRun: '1' })
    harness.run('SCAN')
    harness.latencyMs = 4_000

    const reports = harness.runToCompletion('EXECUTE')

    expect(reports.length).toBeGreaterThan(2)
    const row = harness.store.at('Team Files/Busy.pdf')
    const contents = scenario.drive
      .file(row.destId)
      .comments.map((comment) => comment.content)
    expect(contents).toHaveLength(30)
    expect(new Set(contents).size).toBe(30)
    expect(row.result).toBe(
      'copied; 30 comment thread(s), 30 re-posted as text'
    )
  })

  it('note a problem without failing the copy', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario)
    harness.run('SCAN')
    scenario.drive.failNext(
      'GET',
      /\/comments$/,
      403,
      'insufficientFilePermissions'
    )

    harness.run('EXECUTE')

    const failed = harness.store
      .readItems()
      .filter((item) => item.result.includes('could not read comments'))
    expect(failed).toHaveLength(1)
    expect(failed[0]?.status).toBe('DONE')
  })
})

describe('identical comment threads', () => {
  function withTwins(): ReturnType<typeof buildScenario> & { pdf: string } {
    const scenario = buildScenario()
    const pdf = scenario.drive.addFile(
      'Twins.pdf',
      scenario.sourceId,
      PDF_MIME,
      {
        owner: { emailAddress: 'carol@other.example', displayName: 'Carol' },
      }
    )
    scenario.drive.addComment(pdf, 'Same words', {
      replies: [{ content: 'one' }],
    })
    scenario.drive.addComment(pdf, 'Same words', {
      replies: [{ content: 'two' }],
    })
    return { ...scenario, pdf }
  }

  it('are each carried over', () => {
    const scenario = withTwins()
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    harness.run('EXECUTE')

    const copy = scenario.drive.file(
      harness.store.at('Team Files/Twins.pdf').destId
    )
    expect(copy.comments).toHaveLength(2)
    expect(
      copy.comments.map((comment) => comment.replies?.[0]?.content)
    ).toEqual([
      `${REPLY_BANNER} Bob Replier - 2024-03-02\none`,
      `${REPLY_BANNER} Bob Replier - 2024-03-02\ntwo`,
    ])
  })

  it('are not posted a third time when the file is finished again', () => {
    const scenario = withTwins()
    const harness = harnessFor(scenario, { minutesPerRun: '1' })
    harness.run('SCAN')
    harness.latencyMs = 5_000

    harness.runToCompletion('EXECUTE')

    const copy = scenario.drive.file(
      harness.store.at('Team Files/Twins.pdf').destId
    )
    expect(copy.comments).toHaveLength(2)
    expect(
      copy.comments.every((comment) => comment.replies?.length === 1)
    ).toBe(true)
  })
})

describe('recreated shortcuts', () => {
  it('point at the new folder when their target is a folder in the tree', () => {
    const scenario = buildScenario()
    scenario.drive.addShortcut(
      'To the budget',
      scenario.sourceId,
      scenario.ids.budgetFolder
    )
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    harness.run('EXECUTE')

    const shortcut = scenario.drive.file(
      harness.store.at('Team Files/To the budget').destId
    )
    expect(shortcut.shortcutTargetId).toBe(
      harness.store.at('Team Files/Budget').destId
    )
  })

  it('keep the original target when it was itself only linked to', () => {
    const scenario = buildScenario()
    const harness = harnessFor(scenario, { othersFiles: 'SHORTCUT' })
    harness.run('SCAN')

    harness.run('EXECUTE')

    const shortcut = scenario.drive.file(
      harness.store.at('Team Files/Shortcut to Notes').destId
    )
    expect(shortcut.shortcutTargetId).toBe(scenario.ids.notes)
  })

  it('keep a target that lies outside the migrated tree', () => {
    const scenario = buildScenario()
    const outside = scenario.drive.addFile(
      'Elsewhere',
      'my-drive-root-0001',
      DOC_MIME
    )
    scenario.drive.addShortcut('Out there', scenario.sourceId, outside)
    const harness = harnessFor(scenario)
    harness.run('SCAN')

    harness.run('EXECUTE')

    const shortcut = scenario.drive.file(
      harness.store.at('Team Files/Out there').destId
    )
    expect(shortcut.shortcutTargetId).toBe(outside)
  })
})
