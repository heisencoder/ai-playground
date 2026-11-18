import { CONFIG_FIELDS } from '../../src/core/config'
import type { ConfigKey } from '../../src/core/config'
import type { JobKind, JobReport, Start } from '../../src/core/jobs'
import { runJob } from '../../src/core/jobs'
import { DriveClient } from '../../src/drive/client'
import { FakeClock } from './fakeGas'
import {
  DOC_MIME,
  FakeDrive,
  MAP_MIME,
  MY_DRIVE_ROOT,
  PDF_MIME,
  SHEET_MIME,
} from './fakeDrive'
import { MemoryStore } from './memoryStore'

export const CAROL = {
  emailAddress: 'carol@other.example',
  displayName: 'Carol',
}
export const DAVE = { emailAddress: 'dave@other.example', displayName: 'Dave' }

export interface Scenario {
  drive: FakeDrive
  sourceId: string
  sharedDriveId: string
  ids: Record<
    | 'budgetFolder'
    | 'budget'
    | 'notes'
    | 'locked'
    | 'archive'
    | 'oldPlan'
    | 'map'
    | 'empty'
    | 'roadmap'
    | 'shortcut'
    | 'spec',
    string
  >
}

/**
 * A small tree with one of everything that makes a migration interesting:
 *
 *   Team Files/
 *     Archive/
 *       Empty/
 *       Office map        Google Map, Carol's      (cannot be copied)
 *       Old plan          Doc, mine
 *     Budget/
 *       2024 Budget       Sheet, mine, 12 revisions, 1 open comment
 *       Locked report     PDF, Dave's, copying disabled
 *       Notes             Doc, Carol's, 7 revisions, 2 open + 1 resolved thread
 *     Roadmap             Doc, mine, 30 revisions, 1 open + 1 resolved thread
 *     Shared spec         Doc, Carol's
 *     Shortcut to Notes   shortcut -> Notes
 */
export function buildScenario(): Scenario {
  const drive = new FakeDrive()
  const sharedDriveId = drive.addSharedDrive('Team Drive')
  const sourceId = drive.addFolder('Team Files', MY_DRIVE_ROOT)

  const budgetFolder = drive.addFolder('Budget', sourceId)
  const budget = drive.addFile('2024 Budget', budgetFolder, SHEET_MIME, {
    revisions: 12,
    size: 2048,
  })
  drive.addComment(budget, 'Check the Q3 total', { quoted: 'Q3: 14,200' })
  const notes = drive.addFile('Notes', budgetFolder, DOC_MIME, {
    owner: CAROL,
    revisions: 7,
  })
  drive.addComment(notes, 'Is this still current?', {
    replies: [{ content: 'Yes, as of March.' }],
  })
  drive.addComment(notes, 'Add the vendor list')
  drive.addComment(notes, 'Typo in heading', {
    resolved: true,
    quoted: 'Bugdet',
    author: 'Dave',
  })
  const locked = drive.addFile('Locked report', budgetFolder, PDF_MIME, {
    owner: DAVE,
    copyable: false,
    size: 500_000,
  })

  const archive = drive.addFolder('Archive', sourceId)
  const oldPlan = drive.addFile('Old plan', archive, DOC_MIME, { revisions: 3 })
  const map = drive.addFile('Office map', archive, MAP_MIME, { owner: CAROL })
  const empty = drive.addFolder('Empty', archive)

  const roadmap = drive.addFile('Roadmap', sourceId, DOC_MIME, {
    revisions: 30,
  })
  drive.addComment(roadmap, 'Move this to Q2?', {
    replies: [{ content: 'Agreed.' }],
  })
  drive.addComment(roadmap, 'Old question', { resolved: true })
  const spec = drive.addFile('Shared spec', sourceId, DOC_MIME, {
    owner: CAROL,
  })
  const shortcut = drive.addShortcut('Shortcut to Notes', sourceId, notes)

  return {
    drive,
    sourceId,
    sharedDriveId,
    ids: {
      budgetFolder,
      budget,
      notes,
      locked,
      archive,
      oldPlan,
      map,
      empty,
      roadmap,
      shortcut,
      spec,
    },
  }
}

/** Config-sheet values keyed by label, from values keyed by field name. */
export function configValues(
  values: Partial<Record<ConfigKey, string>>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const field of CONFIG_FIELDS) {
    const value = values[field.key]
    if (value !== undefined) {
      result[field.label] = value
    }
  }
  return result
}

/** The core wired to a fake Drive and an in-memory store, with a fake clock. */
export class CoreHarness {
  readonly store = new MemoryStore()
  readonly clock = new FakeClock()
  readonly sleeps: number[] = []
  /** Simulated duration of one Drive API call. */
  latencyMs = 300

  constructor(
    readonly drive: FakeDrive,
    config: Partial<Record<ConfigKey, string>>
  ) {
    this.store.config = configValues(config)
    drive.onRequest = () => {
      this.clock.advance(this.latencyMs)
    }
  }

  configure(config: Partial<Record<ConfigKey, string>>): void {
    Object.assign(this.store.config, configValues(config))
  }

  client(readOnly: boolean): DriveClient {
    return new DriveClient({
      transport: this.drive.handle,
      sleep: (milliseconds) => {
        this.sleeps.push(milliseconds)
        this.clock.advance(milliseconds)
      },
      readOnly,
      random: () => 0,
    })
  }

  run(kind: JobKind, fresh = true): JobReport {
    return this.runAs(kind, fresh ? 'FRESH' : 'CONTINUE')
  }

  runAs(kind: JobKind, start: Start): JobReport {
    return runJob(kind, start, {
      store: this.store,
      clock: this.clock,
      makeDrive: (readOnly) => this.client(readOnly),
    })
  }

  /** Starts a job and keeps continuing it until it reports completion. */
  runToCompletion(kind: JobKind, maxRuns = 50): JobReport[] {
    const reports = [this.run(kind, true)]
    while (reports[reports.length - 1]?.complete !== true) {
      if (reports.length >= maxRuns) {
        throw new Error(`${kind} did not finish in ${String(maxRuns)} runs`)
      }
      reports.push(this.run(kind, false))
    }
    return reports
  }
}

export function harnessFor(
  scenario: Scenario,
  config: Partial<Record<ConfigKey, string>> = {}
): CoreHarness {
  return new CoreHarness(scenario.drive, {
    sourceId: scenario.sourceId,
    destinationId: scenario.sharedDriveId,
    ...config,
  })
}
