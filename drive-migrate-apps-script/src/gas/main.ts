/**
 * Apps Script entry points: the menu, the functions behind it, and the
 * time-driven trigger that carries a long job across executions.
 *
 * Everything here is glue. The migration itself lives in `src/core`.
 */

import { ConfigError, errorMessage } from '../core/errors'
import type { JobKind, JobReport } from '../core/jobs'
import { JOB_KINDS, runJob } from '../core/jobs'
import { effectiveAction } from '../core/model'
import { DriveClient } from '../drive/client'
import { SheetStore } from './sheetStore'
import { urlFetchTransport } from './transport'

const MENU_TITLE = 'Drive migration'
const TRIGGER_HANDLER = 'continueFromTrigger'
const CONTINUE_DELAY_MS = 60_000
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
  'Nothing is ever deleted. Moved files keep their ID, revision history and comments. Copies cannot keep revision history.',
].join('\n')

function store(): SheetStore {
  return new SheetStore(SpreadsheetApp.getActiveSpreadsheet())
}

/** `getUi` is unavailable when a trigger, not a person, started the run. */
function tell(message: string, interactive: boolean): void {
  if (interactive) {
    SpreadsheetApp.getUi().alert(
      MENU_TITLE,
      message,
      SpreadsheetApp.getUi().ButtonSet.OK
    )
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      message,
      MENU_TITLE,
      TOAST_SECONDS
    )
  }
}

function deleteContinuations(): void {
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === TRIGGER_HANDLER) {
      ScriptApp.deleteTrigger(trigger)
    }
  }
}

function scheduleContinuation(): void {
  ScriptApp.newTrigger(TRIGGER_HANDLER)
    .timeBased()
    .after(CONTINUE_DELAY_MS)
    .create()
}

function execute(kind: JobKind, fresh: boolean, sheets: SheetStore): JobReport {
  return runJob(kind, fresh, {
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
function run(kind: JobKind, fresh: boolean, interactive: boolean): void {
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
    deleteContinuations()
    sheets.setUp()
    const report = execute(kind, fresh, sheets)
    if (report.continueAutomatically) {
      scheduleContinuation()
    }
    tell(report.headline, interactive)
  } catch (error) {
    const expected = error instanceof ConfigError
    const message = expected
      ? errorMessage(error)
      : `${JOB_NAMES[kind]} stopped on an unexpected error: ${errorMessage(error)}. Nothing was lost; choose "Continue" to carry on.`
    sheets.log(expected ? 'WARN' : 'ERROR', message)
    tell(message, interactive)
  } finally {
    sheets.flush()
    lock.releaseLock()
  }
}

function pausedJob(): JobKind | undefined {
  const name = store().getMeta('job')
  return JOB_KINDS.find((kind) => kind === name)
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
  run('SCAN', true, true)
}

export function dryRun(): void {
  run('DRY_RUN', true, true)
}

export function migrate(): void {
  const ui = SpreadsheetApp.getUi()
  const items = store().readItems()
  const count = (action: string): string =>
    String(
      items.filter(
        (item) => effectiveAction(item) === action && item.status !== 'DONE'
      ).length
    )
  const answer = ui.alert(
    MENU_TITLE,
    `This will change Google Drive: ${count('MOVE')} file(s) moved, ${count('COPY')} copied, ${count('SHORTCUT')} shortcut(s) and ${count('CREATE_FOLDER')} folder(s) created. Nothing is deleted.\n\nMoved files leave the source folder for the shared drive, and the shared drive's organisation becomes their owner. Continue?`,
    ui.ButtonSet.OK_CANCEL
  )
  if (answer === ui.Button.OK) {
    run('EXECUTE', true, true)
  }
}

export function continueJob(): void {
  const kind = pausedJob()
  if (kind === undefined) {
    tell('There is no paused job to continue.', true)
  } else {
    run(kind, false, true)
  }
}

/** Trigger handler. Not on the menu. */
export function continueFromTrigger(): void {
  const kind = pausedJob()
  if (kind === undefined) {
    deleteContinuations()
  } else {
    run(kind, false, false)
  }
}

export function stopJob(): void {
  // No lock: this has to get through while a run is holding it.
  deleteContinuations()
  store().setMeta('stop', '1')
  tell(
    'Stopping. A run that is in progress finishes its current file first. Choose "Continue a paused job" to carry on later.',
    true
  )
}

export function showHelp(): void {
  tell(HELP_TEXT, true)
}
