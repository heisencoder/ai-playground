/**
 * Jobs: the three things the menu can start, each sized to fit in one Apps
 * Script execution and able to carry on in the next one.
 *
 *   SCAN     preflight + inventory + plan      (read-only)
 *   DRY_RUN  simulate the plan                 (read-only)
 *   EXECUTE  carry out the plan
 */

import type { ApplyCounts, ApplyResult, Mode } from './apply'
import { apply, clearDryRun } from './apply'
import { Budget } from './budget'
import { parseConfig } from './config'
import { ConfigError } from './errors'
import type { Clock, Config, DrivePort, Store } from './model'
import type { PlanCounts } from './plan'
import { planItems } from './plan'
import { preflight } from './preflight'
import { continueScan, startScan } from './scan'
import { buildSummary } from './summary'

export type JobKind = 'SCAN' | 'DRY_RUN' | 'EXECUTE'
export const JOB_KINDS: readonly JobKind[] = ['SCAN', 'DRY_RUN', 'EXECUTE']

export interface JobDeps {
  store: Store
  /** A read-only client refuses to send any request that would change Drive. */
  makeDrive: (readOnly: boolean) => DrivePort
  clock: Clock
}

export interface JobReport {
  kind: JobKind
  /** Nothing is left to do. */
  complete: boolean
  /** The run ended because someone chose Stop. */
  stopped: boolean
  /** The caller should schedule another execution to carry on. */
  continueAutomatically: boolean
  headline: string
}

interface JobContext {
  deps: JobDeps
  config: Config
  budget: Budget
  fresh: boolean
}

interface JobOutcome {
  complete: boolean
  text: string
}

function isoTime(clock: Clock): string {
  return new Date(clock.now()).toISOString()
}

function describePlan(counts: PlanCounts): string {
  const by = counts.byAction
  return `${String(by.MOVE)} to move, ${String(by.COPY)} to copy, ${String(by.SHORTCUT)} shortcut(s), ${String(by.SKIP)} to skip, ${String(by.CREATE_FOLDER)} folder(s)`
}

function describeCounts(counts: ApplyCounts): string {
  const folders = counts.folderCreated + counts.folderAdopted
  return [
    `${String(counts.moved)} moved`,
    `${String(counts.copied)} copied`,
    `${String(counts.shortcut)} shortcut(s)`,
    `${String(folders)} folder(s)`,
    `${String(counts.skipped)} skipped`,
    `${String(counts.failed)} failed`,
    `${String(counts.blocked)} blocked`,
  ].join(', ')
}

/** Resolves source and destination and starts a new inventory. */
function prepareScan(context: JobContext): void {
  const { deps, config } = context
  const { store } = deps
  const resolved = preflight(deps.makeDrive(true), config)
  store.setMeta('user', resolved.userEmail)
  store.setMeta('sourceName', resolved.sourceName)
  store.setMeta('destRootId', resolved.destRootId)
  store.setMeta('destDriveId', resolved.destDriveId)
  store.log(
    'INFO',
    `Scanning "${resolved.sourceName}" as ${resolved.userEmail}; destination "${resolved.destName}".`
  )
  startScan(store, resolved.source)
}

function scanJob(context: JobContext): JobOutcome {
  const { deps, config, budget } = context
  const { store } = deps
  const result = continueScan(deps.makeDrive(true), store, budget)
  if (!result.complete) {
    return {
      complete: false,
      text: `Scan paused after ${String(result.total)} item(s)`,
    }
  }
  const items = store.readItems()
  const plan = planItems(items, config)
  store.writeItems(plan.changed)
  // Counted from the sheet, so failures in earlier runs of this scan show too.
  const unlisted = items.filter((item) => item.scanState === 'ERROR').length
  const problems =
    unlisted === 0
      ? ''
      : ` WARNING: ${String(unlisted)} folder(s) could not be listed, so their contents are missing from the plan; see the Log sheet, then scan again.`
  return {
    complete: true,
    text: `Scan complete: ${String(items.length)} item(s). Plan: ${describePlan(plan.counts)}.${problems}`,
  }
}

/**
 * The plan records which files are "mine", so it only makes sense for the
 * account that scanned. Anyone else must scan for themselves.
 */
function assertSameUser(context: JobContext): void {
  const { deps } = context
  const scannedBy = deps.store.getMeta('user')
  const current = deps.makeDrive(true).about().emailAddress ?? ''
  if (scannedBy !== '' && current !== scannedBy) {
    throw new ConfigError(
      `This sheet was scanned by ${scannedBy}, but you are ${current === '' ? 'someone else' : current}. Ownership decides what can be moved, so either ${scannedBy} runs it or you run "Scan and plan" yourself.`
    )
  }
}

function assertScanned(store: Store): void {
  if (store.getMeta('scan') !== 'DONE') {
    throw new ConfigError('Run "Scan and plan" first, and let it finish.')
  }
}

/** Checks the settings against the scan and re-plans, before a fresh run. */
function prepareApply(context: JobContext, mode: Mode): void {
  const { deps, config } = context
  const { store } = deps
  assertScanned(store)
  const items = store.readItems()
  // Preflight only reads, so a read-only client does for both modes.
  const resolved = preflight(deps.makeDrive(true), config)
  // The source folder is the one row without a parent, wherever sorting put it.
  const root = items.find((item) => item.parentId === '')
  if (root?.id !== resolved.source.id) {
    throw new ConfigError(
      'The Source folder has changed since the last scan. Run "Scan and plan" again.'
    )
  }
  const started = items.some(
    (item) => item.destId !== '' && item.status !== 'SKIPPED'
  )
  if (started && resolved.destRootId !== store.getMeta('destRootId')) {
    throw new ConfigError(
      'The Destination has changed since this migration began, and part of it has already gone to the old one. Put the old Destination back to finish it, or run "Scan and plan" again to start over with what is left.'
    )
  }
  store.setMeta('destRootId', resolved.destRootId)
  store.setMeta('destDriveId', resolved.destDriveId)
  const dry = mode === 'DRY_RUN'
  const changed = new Set(planItems(items, config, dry).changed)
  if (dry) {
    for (const item of clearDryRun(items)) {
      changed.add(item)
    }
  }
  store.writeItems([...changed].sort((a, b) => a.row - b.row))
  store.flush()
}

function applyJob(context: JobContext, mode: Mode): JobOutcome {
  const { deps, config, budget } = context
  const { store } = deps
  assertScanned(store)
  const dry = mode === 'DRY_RUN'
  const result: ApplyResult = apply(
    {
      drive: deps.makeDrive(dry),
      store,
      config,
      budget,
      destRootId: store.getMeta('destRootId'),
      destDriveId: store.getMeta('destDriveId'),
      timestamp: () => isoTime(deps.clock),
    },
    mode,
    store.readItems()
  )
  const label = dry ? 'Dry run' : 'Migration'
  const counts = describeCounts(result.counts)
  const wording = dry ? `would be: ${counts}` : counts
  return {
    complete: result.complete,
    text: result.complete
      ? `${label} complete. This run: ${wording}.`
      : `${label} paused with ${String(result.remaining)} item(s) to go. This run: ${wording}`,
  }
}

function pausedSuffix(report: JobReport): string {
  if (report.complete) {
    return ''
  }
  if (report.stopped) {
    return ' Stopped on request; choose "Continue a paused job" to carry on.'
  }
  return report.continueAutomatically
    ? ' It will continue by itself in about a minute.'
    : ' Choose "Continue a paused job" to carry on.'
}

/**
 * How a run came about:
 *   FRESH     a person chose Scan, Dry run or Migrate
 *   CONTINUE  a person chose "Continue a paused job"
 *   TRIGGER   the continuation trigger fired, with nobody at the keyboard
 */
export type Start = 'FRESH' | 'CONTINUE' | 'TRIGGER'

/** Runs one execution's worth of a job. */
export function runJob(kind: JobKind, start: Start, deps: JobDeps): JobReport {
  const { store, clock } = deps
  const config = parseConfig(store.readConfigValues())
  const stopRequested = (): boolean => store.getMeta('stop') !== ''
  if (start !== 'TRIGGER') {
    // Only a person can lift a Stop; a trigger that fires after one obeys it.
    store.setMeta('stop', '')
  }
  const budget = new Budget(clock, config.minutesPerRun, stopRequested)
  const fresh = start === 'FRESH'
  const context: JobContext = { deps, config, budget, fresh }
  const mode: Mode = kind === 'DRY_RUN' ? 'DRY_RUN' : 'EXECUTE'

  let outcome: JobOutcome
  if (start === 'TRIGGER' && stopRequested()) {
    outcome = { complete: false, text: `${kind} is stopped.` }
  } else {
    // Everything that can refuse the job happens before it is recorded as the
    // job in progress, so "Continue" can never resume one that was refused.
    if (fresh && kind === 'SCAN') {
      prepareScan(context)
    } else {
      assertSameUser(context)
      if (fresh) {
        prepareApply(context, mode)
      }
    }
    store.setMeta('job', kind)
    outcome = kind === 'SCAN' ? scanJob(context) : applyJob(context, mode)
  }

  const stopped = !outcome.complete && stopRequested()
  const report: JobReport = {
    kind,
    complete: outcome.complete,
    stopped,
    continueAutomatically: !outcome.complete && !stopped && config.autoContinue,
    headline: outcome.text,
  }
  report.headline += pausedSuffix(report)
  store.setMeta('job', report.complete ? '' : kind)
  store.writeSummary(
    buildSummary(store.readItems(), report.headline, isoTime(clock))
  )
  store.log('INFO', report.headline)
  store.flush()
  return report
}
