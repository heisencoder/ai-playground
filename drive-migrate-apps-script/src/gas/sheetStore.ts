/**
 * Persistent state kept in the bound spreadsheet.
 *
 *   Config   settings, one per row (label | value | help)
 *   Items    one row per file or folder: the inventory, the plan, and progress
 *   Summary  totals, rewritten after every run
 *   Log      what happened and when
 *
 * Small bits of job state (which job is paused, resolved destination IDs) live
 * in the document properties.
 *
 * Every Items cell is stored as plain text. Left to itself, Sheets would turn a
 * folder called "007" into the number 7 and a file called "=A1" into a formula.
 */

import { DRY_ID_PREFIX } from '../core/apply'
import { CONFIG_FIELDS } from '../core/config'
import type {
  Action,
  Item,
  LogLevel,
  MetaKey,
  NewItem,
  ScanState,
  Status,
  Store,
} from '../core/model'
import {
  ACTIONS,
  FILE_OVERRIDES,
  FOLDER_MIME,
  SHORTCUT_MIME,
  STATUSES,
} from '../core/model'

type Sheet = GoogleAppsScript.Spreadsheet.Sheet
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet

export const SHEET_NAMES = {
  config: 'Config',
  items: 'Items',
  summary: 'Summary',
  log: 'Log',
  /** Override values set aside while a new scan rebuilds the Items sheet. */
  overrides: 'Overrides (kept)',
} as const

const PLAIN_TEXT = '@'
const YES = 'Yes'
const MAX_CELL_TEXT = 2000
const META_PREFIX = 'driveMigrate.'
const DRIVE_OPEN_URL = 'https://drive.google.com/open?id='
const HEADER_ROW = 1
const FIRST_DATA_ROW = 2
const CONFIG_COLUMNS = 3

const TYPE_NAMES: Record<string, string> = {
  [FOLDER_MIME]: 'Folder',
  [SHORTCUT_MIME]: 'Shortcut',
  'application/vnd.google-apps.document': 'Google Doc',
  'application/vnd.google-apps.spreadsheet': 'Google Sheet',
  'application/vnd.google-apps.presentation': 'Google Slides',
  'application/vnd.google-apps.form': 'Google Form',
  'application/vnd.google-apps.drawing': 'Google Drawing',
  'application/pdf': 'PDF',
}

function typeName(mimeType: string): string {
  return TYPE_NAMES[mimeType] ?? mimeType
}

function yes(value: boolean): string {
  return value ? YES : ''
}

function isYes(text: string): boolean {
  return text === YES
}

function oneOf<T extends string>(text: string, allowed: readonly T[]): T | '' {
  const upper = text.trim().toUpperCase()
  return allowed.find((candidate) => candidate === upper) ?? ''
}

function destinationLink(item: Item): string {
  return item.destId === '' || item.destId.startsWith(DRY_ID_PREFIX)
    ? ''
    : DRIVE_OPEN_URL + item.destId
}

interface Column {
  header: string
  read: (item: Item) => string
  /** Absent for display-only columns derived from other fields. */
  write?: (item: Item, text: string) => void
  width?: number
}

/** Shown to the person; never rewritten after the scan (Override is theirs). */
const FIXED_COLUMNS: readonly Column[] = [
  {
    header: 'Path',
    read: (i) => i.path,
    write: (i, t) => (i.path = t),
    width: 360,
  },
  { header: 'Type', read: (i) => typeName(i.mimeType), width: 110 },
  {
    header: 'Owner',
    read: (i) => i.ownerEmail,
    write: (i, t) => (i.ownerEmail = t),
    width: 200,
  },
  {
    header: 'Mine',
    read: (i) => yes(i.ownedByMe),
    write: (i, t) => (i.ownedByMe = isYes(t)),
    width: 50,
  },
  {
    header: 'Size (bytes)',
    read: (i) => (i.size === null ? '' : String(i.size)),
    write: (i, t) => (i.size = t === '' ? null : Number(t)),
    width: 90,
  },
  {
    header: 'Override',
    read: (i) => i.override,
    write: (i, t) => (i.override = oneOf<Action>(t, ACTIONS)),
    width: 110,
  },
]

/** Rewritten as the plan is made and carried out. */
const PROGRESS_COLUMNS: readonly Column[] = [
  {
    header: 'Action',
    read: (i) => i.action,
    write: (i, t) => (i.action = oneOf<Action>(t, ACTIONS)),
    width: 120,
  },
  {
    header: 'Reason',
    read: (i) => i.reason,
    write: (i, t) => (i.reason = t),
    width: 320,
  },
  {
    header: 'Status',
    read: (i) => i.status,
    write: (i, t) => (i.status = oneOf<Status>(t, STATUSES)),
    width: 100,
  },
  {
    header: 'Result',
    read: (i) => i.result,
    write: (i, t) => (i.result = t),
    width: 320,
  },
  {
    header: 'Dry run',
    read: (i) => i.dryRun,
    write: (i, t) => (i.dryRun = t),
    width: 320,
  },
  { header: 'Destination', read: destinationLink, width: 200 },
  {
    header: 'Updated',
    read: (i) => i.updatedAt,
    write: (i, t) => (i.updatedAt = t),
    width: 170,
  },
  {
    header: 'Scan state',
    read: (i) => i.scanState,
    write: (i, t) =>
      (i.scanState = oneOf<Exclude<ScanState, ''>>(t, [
        'PENDING',
        'DONE',
        'ERROR',
      ])),
  },
  {
    header: 'Destination ID',
    read: (i) => i.destId,
    write: (i, t) => (i.destId = t),
  },
  {
    header: 'Destination existed',
    read: (i) => yes(i.destPreExisting),
    write: (i, t) => (i.destPreExisting = isYes(t)),
  },
  {
    header: 'Dry-run destination ID',
    read: (i) => i.dryDestId,
    write: (i, t) => (i.dryDestId = t),
  },
  {
    header: 'Dry-run destination existed',
    read: (i) => yes(i.dryPreExisting),
    write: (i, t) => (i.dryPreExisting = isYes(t)),
  },
]

/** Facts from the scan that the tool needs but a person rarely does. */
const TECHNICAL_COLUMNS: readonly Column[] = [
  { header: 'ID', read: (i) => i.id, write: (i, t) => (i.id = t) },
  { header: 'Name', read: (i) => i.name, write: (i, t) => (i.name = t) },
  {
    header: 'MIME type',
    read: (i) => i.mimeType,
    write: (i, t) => (i.mimeType = t),
  },
  {
    header: 'Parent ID',
    read: (i) => i.parentId,
    write: (i, t) => (i.parentId = t),
  },
  {
    header: 'Depth',
    read: (i) => String(i.depth),
    write: (i, t) => (i.depth = Number(t)),
  },
  {
    header: 'Owner name',
    read: (i) => i.ownerName,
    write: (i, t) => (i.ownerName = t),
  },
  {
    header: 'Created',
    read: (i) => i.createdTime,
    write: (i, t) => (i.createdTime = t),
  },
  {
    header: 'Modified',
    read: (i) => i.modifiedTime,
    write: (i, t) => (i.modifiedTime = t),
  },
  {
    header: 'Can copy',
    read: (i) => yes(i.canCopy),
    write: (i, t) => (i.canCopy = isYes(t)),
  },
  {
    header: 'Can move',
    read: (i) => yes(i.canMoveOut),
    write: (i, t) => (i.canMoveOut = isYes(t)),
  },
  {
    header: 'Shortcut target',
    read: (i) => i.shortcutTargetId,
    write: (i, t) => (i.shortcutTargetId = t),
  },
  {
    header: 'Link',
    read: (i) => i.webViewLink,
    write: (i, t) => (i.webViewLink = t),
  },
]

export const ITEM_COLUMNS: readonly Column[] = [
  ...FIXED_COLUMNS,
  ...PROGRESS_COLUMNS,
  ...TECHNICAL_COLUMNS,
]
const PROGRESS_START = FIXED_COLUMNS.length + 1
const OVERRIDE_COLUMN = FIXED_COLUMNS.length
const ID_COLUMN_INDEX = ITEM_COLUMNS.findIndex(
  (column) => column.header === 'ID'
)

/**
 * Makes text safe to put in a cell. A leading apostrophe tells Sheets "this is
 * text" and is not itself stored, which stops names such as "=SUM(A1)" or
 * "+1" from being read as formulas.
 */
export function toCell(text: string): string {
  const clipped =
    text.length > MAX_CELL_TEXT ? `${text.slice(0, MAX_CELL_TEXT)}...` : text
  return /^[=+\-@']/.test(clipped) ? `'${clipped}` : clipped
}

function fromCell(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return value instanceof Date ? value.toISOString() : ''
}

function blankItem(row: number): Item {
  return {
    row,
    id: '',
    path: '',
    name: '',
    mimeType: '',
    parentId: '',
    depth: 0,
    ownerEmail: '',
    ownerName: '',
    ownedByMe: false,
    size: null,
    createdTime: '',
    modifiedTime: '',
    canCopy: false,
    canMoveOut: false,
    shortcutTargetId: '',
    webViewLink: '',
    scanState: '',
    action: '',
    reason: '',
    override: '',
    status: '',
    destId: '',
    destPreExisting: false,
    result: '',
    dryRun: '',
    dryDestId: '',
    dryPreExisting: false,
    updatedAt: '',
  }
}

function rowValues(item: Item, columns: readonly Column[]): string[] {
  return columns.map((column) => toCell(column.read(item)))
}

/** Grows the grid if needed; `getRange` beyond it would throw. */
function ensureSize(sheet: Sheet, rows: number, columns: number): void {
  const maxRows = sheet.getMaxRows()
  if (rows > maxRows) {
    sheet.insertRowsAfter(maxRows, rows - maxRows)
  }
  const maxColumns = sheet.getMaxColumns()
  if (columns > maxColumns) {
    sheet.insertColumnsAfter(maxColumns, columns - maxColumns)
  }
}

/**
 * Writes a block of text cells. `fresh` cells (rows being added) are first
 * formatted as plain text and may need the grid to grow; cells that already
 * hold this tool's data need neither, which saves several service calls.
 */
function writeBlock(
  sheet: Sheet,
  row: number,
  column: number,
  values: string[][],
  fresh = true
): void {
  const width = values[0]?.length ?? 0
  if (values.length === 0 || width === 0) {
    return
  }
  if (fresh) {
    ensureSize(sheet, row + values.length - 1, column + width - 1)
  }
  const range = sheet.getRange(row, column, values.length, width)
  if (fresh) {
    range.setNumberFormat(PLAIN_TEXT)
  }
  range.setValues(values)
}

export class SheetStore implements Store {
  private readonly pendingLogs: string[][] = []
  /** Overrides set aside by `clearItems`, by file ID; loaded on first use. */
  private keptOverrides: Map<string, string> | null = null

  constructor(
    private readonly spreadsheet: Spreadsheet,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** Creates any missing sheet and Config row. Existing values are kept. */
  setUp(): void {
    this.setUpConfig()
    this.setUpItems()
    this.sheet(SHEET_NAMES.summary)
    const log = this.sheet(SHEET_NAMES.log)
    if (log.getLastRow() === 0) {
      writeBlock(log, HEADER_ROW, 1, [['Time', 'Level', 'Message']])
      log.setFrozenRows(HEADER_ROW)
    }
  }

  /** Sets up only if something is missing; cheap enough to call on every run. */
  ensureReady(): void {
    const ready = [
      SHEET_NAMES.config,
      SHEET_NAMES.items,
      SHEET_NAMES.log,
    ].every(
      (name) => (this.spreadsheet.getSheetByName(name)?.getLastRow() ?? 0) > 0
    )
    if (!ready) {
      this.setUp()
    }
  }

  readConfigValues(): Record<string, string> {
    const sheet = this.sheet(SHEET_NAMES.config)
    const values: Record<string, string> = {}
    for (const row of this.dataRows(sheet, 2)) {
      const label = fromCell(row[0]).trim()
      if (label !== '') {
        values[label] = fromCell(row[1]).trim()
      }
    }
    return values
  }

  readItems(): Item[] {
    const sheet = this.sheet(SHEET_NAMES.items)
    const items: Item[] = []
    this.dataRows(sheet, ITEM_COLUMNS.length).forEach((cells, index) => {
      if (fromCell(cells[ID_COLUMN_INDEX]) === '') {
        return
      }
      const item = blankItem(FIRST_DATA_ROW + index)
      ITEM_COLUMNS.forEach((column, columnIndex) => {
        column.write?.(item, fromCell(cells[columnIndex]))
      })
      items.push(item)
    })
    return items
  }

  appendItems(newItems: NewItem[]): Item[] {
    if (newItems.length === 0) {
      return []
    }
    const sheet = this.sheet(SHEET_NAMES.items)
    const kept = this.overridesKept()
    const firstRow = Math.max(sheet.getLastRow(), HEADER_ROW) + 1
    const items = newItems.map((item, index): Item => ({
      ...item,
      override: oneOf<Action>(kept.get(item.id) ?? item.override, ACTIONS),
      row: firstRow + index,
    }))
    writeBlock(
      sheet,
      firstRow,
      1,
      items.map((item) => rowValues(item, ITEM_COLUMNS))
    )
    return items
  }

  /**
   * Writes the progress columns only; the Override column is never touched.
   *
   * Row numbers were read at the start of the run, and a person may have
   * sorted, inserted or deleted rows since. So each row's ID is checked first,
   * and rows that have moved are found again by ID. Writing progress onto the
   * wrong file's row would be far worse than the extra read.
   */
  writeItems(items: readonly Item[]): void {
    if (items.length === 0) {
      return
    }
    const sheet = this.sheet(SHEET_NAMES.items)
    this.relocate(sheet, items)
    const sorted = [...items].sort((a, b) => a.row - b.row)
    let run: Item[] = []
    const writeRun = (): void => {
      const first = run[0]
      if (first !== undefined) {
        writeBlock(
          sheet,
          first.row,
          PROGRESS_START,
          run.map((item) => rowValues(item, PROGRESS_COLUMNS)),
          false
        )
      }
      run = []
    }
    for (const item of sorted) {
      const previous = run[run.length - 1]
      if (previous !== undefined && item.row !== previous.row + 1) {
        writeRun()
      }
      run.push(item)
    }
    writeRun()
  }

  /**
   * Remembers Override values by file ID, then empties the inventory. A new
   * scan gives them back to the same files as it finds them (`appendItems`).
   */
  clearItems(): void {
    const kept = new Map(this.overridesKept())
    // The Items sheet is the truth for every file on it, including a cell
    // the person has since emptied; the stash only speaks for files that an
    // interrupted scan had not got back to yet.
    for (const item of this.readItems()) {
      if (item.override === '') {
        kept.delete(item.id)
      } else {
        kept.set(item.id, item.override)
      }
    }
    const stash = this.sheet(SHEET_NAMES.overrides)
    stash.clearContents()
    writeBlock(stash, HEADER_ROW, 1, [
      ['File ID', 'Override'],
      ...[...kept.entries()].map(([id, override]) => [toCell(id), override]),
    ])
    this.keptOverrides = kept

    const sheet = this.sheet(SHEET_NAMES.items)
    const lastRow = sheet.getLastRow()
    if (lastRow >= FIRST_DATA_ROW) {
      sheet
        .getRange(FIRST_DATA_ROW, 1, lastRow - HEADER_ROW, ITEM_COLUMNS.length)
        .clearContent()
    }
  }

  getMeta(key: MetaKey): string {
    return (
      PropertiesService.getDocumentProperties().getProperty(
        META_PREFIX + key
      ) ?? ''
    )
  }

  setMeta(key: MetaKey, value: string): void {
    PropertiesService.getDocumentProperties().setProperty(
      META_PREFIX + key,
      value
    )
  }

  log(level: LogLevel, message: string): void {
    this.pendingLogs.push([this.now().toISOString(), level, toCell(message)])
  }

  writeSummary(rows: string[][]): void {
    const sheet = this.sheet(SHEET_NAMES.summary)
    sheet.clearContents()
    const width = Math.max(...rows.map((row) => row.length))
    writeBlock(
      sheet,
      HEADER_ROW,
      1,
      rows.map((row) =>
        Array.from({ length: width }, (_, index) => toCell(row[index] ?? ''))
      )
    )
  }

  flush(): void {
    if (this.pendingLogs.length > 0) {
      const sheet = this.sheet(SHEET_NAMES.log)
      writeBlock(
        sheet,
        Math.max(sheet.getLastRow(), HEADER_ROW) + 1,
        1,
        this.pendingLogs.splice(0)
      )
    }
    SpreadsheetApp.flush()
  }

  private overridesKept(): Map<string, string> {
    if (this.keptOverrides === null) {
      const stash = this.spreadsheet.getSheetByName(SHEET_NAMES.overrides)
      this.keptOverrides = new Map(
        (stash === null ? [] : this.dataRows(stash, 2)).map((row) => [
          fromCell(row[0]),
          fromCell(row[1]),
        ])
      )
    }
    return this.keptOverrides
  }

  /** Makes every item's `row` point at the row that holds its ID right now. */
  private relocate(sheet: Sheet, items: readonly Item[]): void {
    const rows = items.map((item) => item.row)
    const first = Math.min(...rows)
    const last = Math.max(...rows)
    const inPlace =
      first >= FIRST_DATA_ROW &&
      last <= sheet.getMaxRows() &&
      this.idsMatch(sheet, items, first, last)
    if (inPlace) {
      return
    }
    const rowById = new Map<string, number>()
    this.readIds(sheet, FIRST_DATA_ROW, sheet.getLastRow()).forEach(
      (id, index) => {
        if (id !== '') {
          rowById.set(id, FIRST_DATA_ROW + index)
        }
      }
    )
    for (const item of items) {
      const row = rowById.get(item.id)
      if (row === undefined) {
        throw new Error(
          `The Items row for "${item.path}" has gone. Rows must not be deleted while a job is running; run "Scan and plan" again.`
        )
      }
      item.row = row
    }
  }

  private idsMatch(
    sheet: Sheet,
    items: readonly Item[],
    first: number,
    last: number
  ): boolean {
    const ids = this.readIds(sheet, first, last)
    return items.every((item) => ids[item.row - first] === item.id)
  }

  private readIds(sheet: Sheet, first: number, last: number): string[] {
    if (last < first) {
      return []
    }
    return (
      sheet
        .getRange(first, ID_COLUMN_INDEX + 1, last - first + 1, 1)
        .getValues() as unknown[][]
    ).map((row) => fromCell(row[0]))
  }

  private sheet(name: string): Sheet {
    return (
      this.spreadsheet.getSheetByName(name) ??
      this.spreadsheet.insertSheet(name)
    )
  }

  /** Every row below the header, `columns` wide. */
  private dataRows(sheet: Sheet, columns: number): unknown[][] {
    const lastRow = sheet.getLastRow()
    if (lastRow < FIRST_DATA_ROW || sheet.getMaxColumns() < columns) {
      return []
    }
    return sheet
      .getRange(FIRST_DATA_ROW, 1, lastRow - HEADER_ROW, columns)
      .getValues() as unknown[][]
  }

  private setUpConfig(): void {
    const sheet = this.sheet(SHEET_NAMES.config)
    if (sheet.getLastRow() === 0) {
      writeBlock(sheet, HEADER_ROW, 1, [['Setting', 'Value', 'What it does']])
      sheet.setFrozenRows(HEADER_ROW)
      sheet.setColumnWidth(1, 240)
      sheet.setColumnWidth(2, 360)
      sheet.setColumnWidth(CONFIG_COLUMNS, 720)
    }
    const existing = this.readConfigValues()
    for (const field of CONFIG_FIELDS) {
      if (!(field.label in existing)) {
        const row = sheet.getLastRow() + 1
        writeBlock(sheet, row, 1, [
          [field.label, field.defaultValue, field.help],
        ])
        if (field.choices !== undefined) {
          sheet.getRange(row, 2).setDataValidation(
            SpreadsheetApp.newDataValidation()
              .requireValueInList([...field.choices], true)
              .setAllowInvalid(false)
              .build()
          )
        }
      }
    }
  }

  private setUpItems(): void {
    const sheet = this.sheet(SHEET_NAMES.items)
    writeBlock(sheet, HEADER_ROW, 1, [
      ITEM_COLUMNS.map((column) => column.header),
    ])
    sheet.setFrozenRows(HEADER_ROW)
    ITEM_COLUMNS.forEach((column, index) => {
      if (column.width !== undefined) {
        sheet.setColumnWidth(index + 1, column.width)
      }
    })
    ensureSize(sheet, FIRST_DATA_ROW, ITEM_COLUMNS.length)
    sheet
      .getRange(
        FIRST_DATA_ROW,
        OVERRIDE_COLUMN,
        sheet.getMaxRows() - HEADER_ROW,
        1
      )
      .setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(['CREATE_FOLDER', ...FILE_OVERRIDES], true)
          .setAllowInvalid(true)
          .build()
      )
  }
}
