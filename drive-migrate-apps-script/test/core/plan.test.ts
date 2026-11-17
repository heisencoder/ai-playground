import { describe, expect, it } from 'vitest'
import { parseConfig } from '../../src/core/config'
import type { Config, Item } from '../../src/core/model'
import { FOLDER_MIME, SHORTCUT_MIME } from '../../src/core/model'
import { classify, overrideProblem, planItems } from '../../src/core/plan'
import { toNewItem } from '../../src/core/scan'
import {
  dryStatusOf,
  formatDryRun,
  inScope,
  provenance,
} from '../../src/core/apply'
import { buildSummary, formatBytes } from '../../src/core/summary'
import { Budget } from '../../src/core/budget'
import { DOC_MIME, MAP_MIME } from '../fakes/fakeDrive'
import { configValues } from '../fakes/scenario'

function config(overrides: Parameters<typeof configValues>[0] = {}): Config {
  return parseConfig(
    configValues({
      sourceId: 'source-folder-id',
      destinationId: 'dest-drive-id-1',
      ...overrides,
    })
  )
}

function item(overrides: Partial<Item> = {}): Item {
  return {
    ...toNewItem({ id: 'file-1', name: 'File', mimeType: DOC_MIME }, null),
    row: 2,
    ownedByMe: true,
    canMoveOut: true,
    ownerEmail: 'me@example.com',
    ...overrides,
  }
}

const theirs = {
  ownedByMe: false,
  canMoveOut: false,
  ownerEmail: 'x@y.example',
}

describe('classify', () => {
  it.each([
    ['a folder', { mimeType: FOLDER_MIME }, {}, 'CREATE_FOLDER'],
    [
      "someone else's folder",
      { mimeType: FOLDER_MIME, ...theirs },
      {},
      'CREATE_FOLDER',
    ],
    ['a shortcut', { mimeType: SHORTCUT_MIME }, {}, 'SHORTCUT'],
    ['my movable file', {}, {}, 'MOVE'],
    ['my file that cannot be moved', { canMoveOut: false }, {}, 'COPY'],
    [
      'my unmovable, uncopyable file',
      { canMoveOut: false, mimeType: MAP_MIME },
      {},
      'SKIP',
    ],
    ["someone else's file", theirs, {}, 'COPY'],
    [
      "someone else's file, copying disabled",
      { ...theirs, canCopy: false },
      {},
      'SKIP',
    ],
    [
      "someone else's Google Map",
      { ...theirs, mimeType: MAP_MIME },
      {},
      'SKIP',
    ],
    [
      "someone else's file, policy SHORTCUT",
      theirs,
      { othersFiles: 'SHORTCUT' },
      'SHORTCUT',
    ],
    [
      "someone else's file, policy SKIP",
      theirs,
      { othersFiles: 'SKIP' },
      'SKIP',
    ],
    [
      "someone else's file, try moving",
      theirs,
      { tryMoveOthersFiles: 'Yes' },
      'MOVE',
    ],
  ] as const)('%s -> %s', (_name, fields, settings, expected) => {
    expect(classify(item(fields), config(settings)).action).toBe(expected)
  })

  it('names the owner and what is lost in the reason', () => {
    const decision = classify(item(theirs), config())

    expect(decision.reason).toBe(
      'owned by x@y.example; copied (revision history is lost)'
    )
  })

  it('copes with an owner whose address is hidden', () => {
    const decision = classify(item({ ...theirs, ownerEmail: '' }), config())

    expect(decision.reason).toContain('owned by another user')
  })
})

describe('planItems', () => {
  it('never re-plans a row that is DONE', () => {
    const done = item({ status: 'DONE', action: 'COPY', reason: 'earlier' })

    const { changed } = planItems([done], config())

    expect(changed).toEqual([])
    expect(done.action).toBe('COPY')
  })

  it('makes unfinished rows PENDING but leaves IN_PROGRESS ones be', () => {
    const failed = item({ id: 'a', status: 'FAILED' })
    const running = item({ id: 'b', status: 'IN_PROGRESS' })

    planItems([failed, running], config())

    expect(failed.status).toBe('PENDING')
    expect(running.status).toBe('IN_PROGRESS')
  })

  it('keeps every status when asked to (dry run)', () => {
    const failed = item({ status: 'FAILED' })

    planItems([failed], config(), true)

    expect(failed.status).toBe('FAILED')
    expect(failed.action).toBe('MOVE')
  })

  it('counts what the plan holds, overrides included', () => {
    const rows = [item({ id: 'a' }), item({ id: 'b', override: 'SKIP' })]

    const { counts } = planItems(rows, config())

    expect(counts.byAction.MOVE).toBe(1)
    expect(counts.byAction.SKIP).toBe(1)
    expect(counts.total).toBe(2)
  })
})

describe('overrideProblem', () => {
  it('accepts sensible overrides', () => {
    expect(overrideProblem(item({ override: '' }))).toBe('')
    expect(overrideProblem(item({ override: 'SHORTCUT' }))).toBe('')
    expect(
      overrideProblem(item({ mimeType: FOLDER_MIME, override: 'SKIP' }))
    ).toBe('')
  })
})

describe('dry-run text', () => {
  it.each([
    ['moved', 'would move', 'DONE'],
    ['skipped', 'not wanted', 'SKIPPED'],
    ['blocked', 'no parent', 'BLOCKED'],
    ['failed', 'bad override', 'FAILED'],
  ] as const)('round-trips %s', (kind, message, status) => {
    const text = formatDryRun(kind, message)

    expect(dryStatusOf(item({ dryRun: text }))).toBe(status)
  })

  it('is empty for a row that has not been simulated', () => {
    expect(dryStatusOf(item())).toBe('')
  })
})

describe('inScope', () => {
  it.each([
    ['A/B', '', true],
    ['A/B', 'A/B', true],
    ['A/B/C', 'A/B', true],
    ['A', 'A/B', true],
    ['A/Bx', 'A/B', false],
    ['A/C', 'A/B', false],
  ])('%s under filter "%s" -> %s', (path, filter, expected) => {
    expect(inScope(path, filter)).toBe(expected)
  })
})

describe('provenance', () => {
  it('records where a copy came from', () => {
    const text = provenance(
      item({
        ownerName: 'Carol',
        ownerEmail: 'carol@other.example',
        createdTime: '2023-01-15T09:00:00.000Z',
        modifiedTime: '2024-06-20T16:30:00.000Z',
        webViewLink: 'https://example.test/original',
      }),
      '2026-11-17T09:00:00.000Z'
    )

    expect(text).toBe(
      'Copied into this shared drive on 2026-11-17. Original owner: Carol <carol@other.example>. Original created: 2023-01-15; last modified: 2024-06-20. Original file: https://example.test/original Revision history could not be carried over because the original was copied, not moved.'
    )
  })
})

describe('summary', () => {
  it('formats sizes for people', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1023)).toBe('1023 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(5 * 1024 ** 3)).toBe('5.0 GB')
  })

  it('totals files per owner, with how many keep their history', () => {
    const rows = buildSummary(
      [
        item({ id: 'a', action: 'MOVE', size: 1024, status: 'DONE' }),
        item({
          id: 'b',
          action: 'COPY',
          ...theirs,
          size: 2048,
          status: 'PENDING',
        }),
        item({
          id: 'c',
          action: 'COPY',
          ...theirs,
          ownerEmail: '',
          status: 'PENDING',
        }),
        item({ id: 'd', mimeType: FOLDER_MIME, action: 'CREATE_FOLDER' }),
      ],
      'Headline',
      '2026-11-17T09:00:00.000Z'
    )

    expect(rows[1]).toEqual(['Headline', ''])
    expect(rows).toContainEqual(['COPY', '2'])
    expect(rows).toContainEqual(['DONE', '1'])
    expect(rows).toContainEqual(['me@example.com', '1', '1.0 KB', '1', '0'])
    expect(rows).toContainEqual(['x@y.example', '1', '2.0 KB', '0', '1'])
    expect(rows).toContainEqual(['(unknown)', '1', '0 B', '0', '1'])
  })
})

describe('Budget', () => {
  it('expires when the time is used up', () => {
    let now = 0
    const budget = new Budget({ now: () => now }, 2)

    expect(budget.expired()).toBe(false)
    now = 119_999
    expect(budget.expired()).toBe(false)
    now = 120_000
    expect(budget.expired()).toBe(true)
    expect(budget.wasStopped()).toBe(false)
  })

  it('polls the stop flag sparingly and remembers the answer', () => {
    let now = 0
    let polls = 0
    let stop = false
    const budget = new Budget({ now: () => now }, 5, () => {
      polls += 1
      return stop
    })

    expect(budget.expired()).toBe(false)
    stop = true
    now = 1000
    expect(budget.expired()).toBe(false) // too soon to ask again
    now = 6000
    expect(budget.expired()).toBe(true)
    expect(budget.expired()).toBe(true)
    expect(polls).toBe(2)
    expect(budget.wasStopped()).toBe(true)
  })
})
