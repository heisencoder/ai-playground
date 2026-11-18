/**
 * Apps Script entry points: the menu, the functions behind it, and the
 * time-driven trigger that carries a long job across executions.
 *
 * Everything here is glue. The migration itself lives in `src/core`.
 */

import { inScope } from '../core/apply'
import { parseConfig } from '../core/config'
import { ConfigError, errorMessage } from '../core/errors'
import type { JobKind, JobReport, Start } from '../core/jobs'
import { JOB_KINDS, runJob } from '../core/jobs'
import type { Config } from '../core/model'
import { effectiveAction } from '../core/model'
import { DriveClient } from '../drive/client'
import { SheetStore } from './sheetStore'
import { urlFetchTransport } from './transport'

const MENU_TITLE = 'Drive migration'
const TRIGGER_HANDLER = 'continueFromTrigger'
const CONTINUE_DELAY_MS = 60_000
/**
 * Apps Script kills an execution at six minutes without running any more of
 * its code, so a run cannot schedule its own successor at that point. Each run
 * therefore sets this safety net first, timed for after it must have ended,
 * and swaps it for the normal one-minute continuation when it ends properly.
 */
const SAFETY_DELAY_MS = 7 * 60_000
/** Give up continuing by trigger after this many runs in a row were killed. */
const MAX_STRIKES = 3
const LOCK_WAIT_MS = 1000
const TOAST_SECONDS = 15

const JOB_NAMES: Record<JobKind, string> = {
  SCAN: 'Scan',
  DRY_RUN: 'Dry run',
  EXECUTE: 'Migration',
}

const HELP_TEXT = [
  '1. "Set up sheets", then fill in Source folder and Destination on the Config sheet.',
  '2. "Scan and plan" lists every file on the Items sheet with the action planned for it. Nothing in Drive changes.',
  '3. Review the Items sheet. Type MOVE, COPY, SHORTCUT or SKIP in the Override column to change a row.',
  '4. "Dry run" fills the Dry run column with exactly what would happen. Nothing in Drive changes.',
  '5. "Migrate" does it. Long jobs pause and continue by themselves; "Stop" halts them and "Continue" picks up again.',
  '',
  'Do not sort, insert or delete rows on the Items sheet while a job is running.',
  'Nothing is ever deleted. Moved files keep their ID, revision history and comments. Copies cannot keep revision history.',
].join('\n')

function store(): SheetStore {
  return new SheetStore(SpreadsheetApp.getActiveSpreadsheet())
}

/** `getUi` is unavailable when a trigger, not a person, started the run. */
function tell(message: string, interactive: boolean): void {
  if (interactive) {
    const ui = SpreadsheetApp.getUi()
    ui.alert(MENU_TITLE, message, ui.ButtonSet.OK)
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      message,
      MENU_TITLE,
      TOAST_SECONDS
    )
  }
}

function confirm(message: string): boolean {
  const ui = SpreadsheetApp.getUi()
  return ui.alert(MENU_TITLE, message, ui.ButtonSet.OK_CANCEL) === ui.Button.OK
}

function deleteContinuations(): void {
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === TRIGGER_HANDLER) {
      ScriptApp.deleteTrigger(trigger)
    }
  }
}

function scheduleContinuation(delayMs: number): void {
  ScriptApp.newTrigger(TRIGGER_HANDLER).timeBased().after(delayMs).create()
}

/** The settings, or `null` if the Config sheet does not parse yet. */
function configOrNull(sheets: SheetStore): Config | null {
  try {
    return parseConfig(sheets.readConfigValues())
  } catch (error) {
    if (error instanceof ConfigError) {
      return null
    }
    throw error
  }
}

function execute(kind: JobKind, start: Start, sheets: SheetStore): JobReport {
  return runJob(kind, start, {
    store: sheets,
    clock: { now: () => Date.now() },
    makeDrive: (readOnly) =>
      new DriveClient({
        transport: urlFetchTransport,
        sleep: (milliseconds) => {
          Utilities.sleep(milliseconds)
        },
        readOnly,
      }),
  })
}

/** Runs one execution of a job under the document lock and reports back. */
function run(kind: JobKind, start: Start): void {
  const interactive = start !== 'TRIGGER'
  const lock = LockService.getDocumentLock()
  if (!lock.tryLock(LOCK_WAIT_MS)) {
    tell(
      'A run is already in progress. Wait for it, or choose "Stop".',
      interactive
    )
    return
  }
  const sheets = store()
  try {
    sheets.ensureReady()
    deleteContinuations()
    if (configOrNull(sheets)?.autoContinue === true) {
      scheduleContinuation(SAFETY_DELAY_MS)
    }
    // Counts runs that began and never reached the end of this function.
    const strikes = Number(sheets.getMeta('strikes') || '0')
    sheets.setMeta('strikes', String(strikes + 1))

    const report = execute(kind, start, sheets)

    deleteContinuations()
    // A Stop may have arrived after the job last looked; it still wins.
    if (report.continueAutomatically && sheets.getMeta('stop') === '') {
      scheduleContinuation(CONTINUE_DELAY_MS)
    }
    tell(report.headline, interactive)
  } catch (error) {
    deleteContinuations()
    const expected = error instanceof ConfigError
    // If the job had got as far as being recorded it can be continued;
    // otherwise it never really started and is simply chosen again.
    const next =
      pausedJob(sheets) === kind
        ? 'choose "Continue a paused job" to carry on'
        : 'choose it from the menu again'
    const message = expected
      ? errorMessage(error)
      : `${JOB_NAMES[kind]} stopped on an unexpected error: ${errorMessage(error)}. Nothing was lost; ${next}.`
    sheets.log(expected ? 'WARN' : 'ERROR', message)
    tell(message, interactive)
  } finally {
    sheets.setMeta('strikes', '0')
    sheets.flush()
    lock.releaseLock()
  }
}

function pausedJob(sheets: SheetStore): JobKind | undefined {
  const name = sheets.getMeta('job')
  return JOB_KINDS.find((kind) => kind === name)
}

/** Starting a different job abandons a paused one; make sure that is meant. */
function okToStart(kind: JobKind, sheets: SheetStore): boolean {
  const paused = pausedJob(sheets)
  return (
    paused === undefined ||
    paused === kind ||
    confirm(
      `A ${JOB_NAMES[paused].toLowerCase()} is paused part-way. Starting a ${JOB_NAMES[kind].toLowerCase()} now means it will not continue by itself. Start anyway?`
    )
  )
}

export function onOpen(): void {
  SpreadsheetApp.getUi()
    .createMenu(MENU_TITLE)
    .addItem('1. Set up sheets', 'setUpSheets')
    .addItem('2. Scan and plan', 'scanAndPlan')
    .addItem('3. Dry run', 'dryRun')
    .addItem('4. Migrate', 'migrate')
    .addSeparator()
    .addItem('Continue a paused job', 'continueJob')
    .addItem('Stop', 'stopJob')
    .addSeparator()
    .addItem('Help', 'showHelp')
    .addToUi()
}

export function setUpSheets(): void {
  const sheets = store()
  sheets.setUp()
  sheets.flush()
  tell(
    'Sheets are ready. Fill in "Source folder" and "Destination" on the Config sheet, then choose "Scan and plan".',
    true
  )
}

export function scanAndPlan(): void {
  const sheets = store()
  sheets.ensureReady()
  if (!okToStart('SCAN', sheets)) {
    return
  }
  const rescan =
    sheets.readItems().length === 0 ||
    confirm(
      'Scanning again rebuilds the Items sheet from what is in Drive now. Your Override values are kept. Progress is not lost: files already moved are no longer in the source, and copies and folders already made are recognised when you migrate. Scan again?'
    )
  if (rescan) {
    run('SCAN', 'FRESH')
  }
}

export function dryRun(): void {
  const sheets = store()
  sheets.ensureReady()
  if (okToStart('DRY_RUN', sheets)) {
    run('DRY_RUN', 'FRESH')
  }
}

export function migrate(): void {
  const sheets = store()
  sheets.ensureReady()
  const filter = configOrNull(sheets)?.pathFilter ?? ''
  const todo = sheets
    .readItems()
    .filter((item) => item.status !== 'DONE' && inScope(item.path, filter))
  const count = (action: string): string =>
    String(todo.filter((item) => effectiveAction(item) === action).length)
  const scope = filter === '' ? '' : ` under "${filter}"`
  const question = `This will change Google Drive${scope}: up to ${count('MOVE')} file(s) moved, ${count('COPY')} copied, ${count('SHORTCUT')} shortcut(s) and ${count('CREATE_FOLDER')} folder(s) created. Nothing is deleted.\n\nMoved files leave the source folder for the shared drive, and the shared drive's organisation becomes their owner. Continue?`
  if (okToStart('EXECUTE', sheets) && confirm(question)) {
    run('EXECUTE', 'FRESH')
  }
}

export function continueJob(): void {
  const kind = pausedJob(store())
  if (kind === undefined) {
    tell('There is no paused job to continue.', true)
  } else {
    run(kind, 'CONTINUE')
  }
}

/** Trigger handler. Not on the menu. */
export function continueFromTrigger(): void {
  const sheets = store()
  const kind = pausedJob(sheets)
  const strikes = Number(sheets.getMeta('strikes') || '0')
  if (kind === undefined || sheets.getMeta('stop') !== '') {
    deleteContinuations()
  } else if (strikes >= MAX_STRIKES) {
    deleteContinuations()
    sheets.log(
      'ERROR',
      `${JOB_NAMES[kind]} was cut off ${String(strikes)} times in a row, so it has stopped continuing by itself. Choose "Continue a paused job" to try again.`
    )
    sheets.flush()
  } else {
    run(kind, 'TRIGGER')
  }
}

export function stopJob(): void {
  // No lock: this has to get through while a run is holding it.
  store().setMeta('stop', '1')
  deleteContinuations()
  tell(
    'Stopping. A run that is in progress finishes its current file first. Choose "Continue a paused job" to carry on later.',
    true
  )
}

export function showHelp(): void {
  tell(HELP_TEXT, true)
}
