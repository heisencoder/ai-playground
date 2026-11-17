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
import type { Clock, Config, DrivePort, Item, Store } from './model'
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

function scanJob(context: JobContext): JobOutcome {
  const { deps, config, budget, fresh } = context
  const { store } = deps
  const drive = deps.makeDrive(true)
  if (fresh || store.getMeta('scan') === '') {
    const resolved = preflight(drive, config)
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
  const result = continueScan(drive, store, budget)
  if (!result.complete) {
    return {
      complete: false,
      text: `Scan paused after ${String(result.total)} item(s)`,
    }
  }
  const items = store.readItems()
  const plan = planItems(items, config)
  store.writeItems(plan.changed)
  const problems =
    result.errors === 0
      ? ''
      : ` ${String(result.errors)} folder(s) could not be listed; see the Log sheet.`
  return {
    complete: true,
    text: `Scan complete: ${String(items.length)} item(s). Plan: ${describePlan(plan.counts)}.${problems}`,
  }
}

function prepareApply(context: JobContext, mode: Mode, items: Item[]): void {
  const { deps, config } = context
  const { store } = deps
  // Preflight only reads, so a read-only client does for both modes.
  const resolved = preflight(deps.makeDrive(true), config)
  // The source folder is the one row without a parent, wherever sorting put it.
  const root = items.find((item) => item.parentId === '')
  if (root?.id !== resolved.source.id) {
    throw new ConfigError(
      'The Source folder has changed since the last scan. Run "Scan and plan" again.'
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
  const { deps, config, budget, fresh } = context
  const { store } = deps
  if (store.getMeta('scan') !== 'DONE') {
    throw new ConfigError('Run "Scan and plan" first, and let it finish.')
  }
  const items = store.readItems()
  if (fresh) {
    prepareApply(context, mode, items)
  }
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
    items
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
    return ' Stopped on request; choose "Continue" to carry on.'
  }
  return report.continueAutomatically
    ? ' It will continue by itself in about a minute.'
    : ' Choose "Continue" to carry on.'
}

/**
 * Runs one execution's worth of a job. `fresh` is true when a person started
 * the job from the menu and false when it is being continued.
 */
export function runJob(
  kind: JobKind,
  fresh: boolean,
  deps: JobDeps
): JobReport {
  const { store, clock } = deps
  const config = parseConfig(store.readConfigValues())
  store.setMeta('stop', '')
  const budget = new Budget(
    clock,
    config.minutesPerRun,
    () => store.getMeta('stop') !== ''
  )
  const context: JobContext = { deps, config, budget, fresh }
  store.setMeta('job', kind)

  const outcome =
    kind === 'SCAN'
      ? scanJob(context)
      : applyJob(context, kind === 'DRY_RUN' ? 'DRY_RUN' : 'EXECUTE')

  const stopped = !outcome.complete && budget.wasStopped()
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
