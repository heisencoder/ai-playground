/**
 * In-memory stand-ins for the Apps Script services this tool uses:
 * SpreadsheetApp (sheets, ranges, the UI), UrlFetchApp, ScriptApp (OAuth token
 * and time-driven triggers), PropertiesService, LockService and Utilities.
 *
 * They emulate the behaviours that have bitten real scripts:
 *
 *   - `getRange` outside the grid throws, as do `setValues` with the wrong shape
 *   - cells that are not formatted as plain text turn "007" into 7 and treat
 *     "=..." as a formula; a leading apostrophe forces text and is not stored
 *   - writes are only durable after `SpreadsheetApp.flush()`; `crash()` throws
 *     away anything written since, as a killed execution might
 *   - `UrlFetchApp.fetch` throws on HTTP errors unless `muteHttpExceptions`
 *   - `getUi()` throws when there is no person at the keyboard (trigger runs)
 */

import type { HttpMethod } from '../../src/drive/client'
import type { FakeDrive } from './fakeDrive'

const DEFAULT_ROWS = 1000
const DEFAULT_COLUMNS = 26
const PLAIN_TEXT = '@'
export const FAKE_TOKEN = 'fake-oauth-token'

type Cell = string | number | boolean

export class FakeClock {
  constructor(private time = Date.UTC(2026, 10, 17, 9, 0, 0)) {}

  now(): number {
    return this.time
  }

  advance(milliseconds: number): void {
    this.time += milliseconds
  }
}

/** A `Date` whose idea of "now" is the fake clock's. */
export function fakeDateClass(clock: FakeClock): DateConstructor {
  const RealDate = Date
  class FakeDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(clock.now())
      } else {
        super(...(args as [number]))
      }
    }

    static override now(): number {
      return clock.now()
    }
  }
  return FakeDate as unknown as DateConstructor
}

function emptyGrid<T>(rows: number, columns: number, fill: T): T[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => fill)
  )
}

/** What Sheets does to a value typed into a cell. */
function coerce(value: unknown, format: string): Cell {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  const text = typeof value === 'string' ? value : ''
  if (text.startsWith("'")) {
    return text.slice(1)
  }
  if (format === PLAIN_TEXT) {
    return text
  }
  if (text.startsWith('=')) {
    return '#NAME?'
  }
  if (text.trim() !== '' && Number.isFinite(Number(text))) {
    return Number(text)
  }
  const upper = text.toUpperCase()
  if (upper === 'TRUE' || upper === 'FALSE') {
    return upper === 'TRUE'
  }
  return text
}

interface SheetState {
  values: Cell[][]
  formats: string[][]
  validations: unknown[][]
}

export class FakeRange {
  constructor(
    private readonly sheet: FakeSheet,
    private readonly row: number,
    private readonly column: number,
    private readonly numRows: number,
    private readonly numColumns: number
  ) {}

  getValues(): Cell[][] {
    return this.cells((r, c) => this.sheet.state.values[r]?.[c] ?? '')
  }

  setValues(values: unknown[][]): this {
    if (
      values.length !== this.numRows ||
      values.some((row) => row.length !== this.numColumns)
    ) {
      throw new Error(
        `The number of rows or columns in the data does not match the range (${String(this.numRows)}x${String(this.numColumns)}).`
      )
    }
    this.each((r, c, i, j) => {
      const format = this.sheet.state.formats[r]?.[c] ?? ''
      this.sheet.set(r, c, coerce(values[i]?.[j], format))
    })
    this.sheet.writeCalls += 1
    return this
  }

  setNumberFormat(format: string): this {
    this.each((r, c) => {
      const row = this.sheet.state.formats[r]
      if (row !== undefined) {
        row[c] = format
      }
    })
    return this
  }

  setDataValidation(rule: unknown): this {
    this.each((r, c) => {
      const row = this.sheet.state.validations[r]
      if (row !== undefined) {
        row[c] = rule
      }
    })
    return this
  }

  clearContent(): this {
    this.each((r, c) => {
      this.sheet.set(r, c, '')
    })
    return this
  }

  private each(
    visit: (r: number, c: number, i: number, j: number) => void
  ): void {
    for (let i = 0; i < this.numRows; i += 1) {
      for (let j = 0; j < this.numColumns; j += 1) {
        visit(this.row - 1 + i, this.column - 1 + j, i, j)
      }
    }
  }

  private cells<T>(read: (r: number, c: number) => T): T[][] {
    return Array.from({ length: this.numRows }, (_, i) =>
      Array.from({ length: this.numColumns }, (_, j) =>
        read(this.row - 1 + i, this.column - 1 + j)
      )
    )
  }
}

export class FakeSheet {
  state: SheetState
  frozenRows = 0
  /** Number of `setValues` calls, a rough measure of how chatty the code is. */
  writeCalls = 0
  private durable: string

  constructor(private readonly name: string) {
    this.state = {
      values: emptyGrid<Cell>(DEFAULT_ROWS, DEFAULT_COLUMNS, ''),
      formats: emptyGrid(DEFAULT_ROWS, DEFAULT_COLUMNS, ''),
      validations: emptyGrid<unknown>(DEFAULT_ROWS, DEFAULT_COLUMNS, null),
    }
    this.durable = JSON.stringify(this.state)
  }

  getName(): string {
    return this.name
  }

  getMaxRows(): number {
    return this.state.values.length
  }

  getMaxColumns(): number {
    return this.state.values[0]?.length ?? 0
  }

  getLastRow(): number {
    for (let r = this.state.values.length - 1; r >= 0; r -= 1) {
      if (this.state.values[r]?.some((cell) => cell !== '') === true) {
        return r + 1
      }
    }
    return 0
  }

  insertRowsAfter(afterPosition: number, howMany: number): this {
    const columns = this.getMaxColumns()
    const template = this.state.formats[afterPosition - 1] ?? []
    this.state.values.splice(
      afterPosition,
      0,
      ...emptyGrid<Cell>(howMany, columns, '')
    )
    this.state.formats.splice(
      afterPosition,
      0,
      ...Array.from({ length: howMany }, () => [...template])
    )
    this.state.validations.splice(
      afterPosition,
      0,
      ...emptyGrid<unknown>(howMany, columns, null)
    )
    return this
  }

  insertColumnsAfter(afterPosition: number, howMany: number): this {
    for (const grid of [this.state.values, this.state.formats] as Cell[][][]) {
      for (const row of grid) {
        row.splice(
          afterPosition,
          0,
          ...Array.from({ length: howMany }, () => '')
        )
      }
    }
    for (const row of this.state.validations) {
      row.splice(
        afterPosition,
        0,
        ...Array.from({ length: howMany }, () => null)
      )
    }
    return this
  }

  getRange(
    row: number,
    column: number,
    numRows = 1,
    numColumns = 1
  ): FakeRange {
    if (
      row < 1 ||
      column < 1 ||
      numRows < 1 ||
      numColumns < 1 ||
      row + numRows - 1 > this.getMaxRows() ||
      column + numColumns - 1 > this.getMaxColumns()
    ) {
      throw new Error(
        'The coordinates of the range are outside the dimensions of the sheet.'
      )
    }
    return new FakeRange(this, row, column, numRows, numColumns)
  }

  clearContents(): this {
    for (const row of this.state.values) {
      row.fill('')
    }
    return this
  }

  setFrozenRows(rows: number): void {
    this.frozenRows = rows
  }

  setColumnWidth(): this {
    return this
  }

  // -- test helpers (not part of the Apps Script API) -------------------------

  set(r: number, c: number, value: Cell): void {
    const row = this.state.values[r]
    if (row === undefined || c >= row.length) {
      throw new Error('fake sheet: write outside the grid')
    }
    row[c] = value
  }

  /** What a person sees: all rows with content, as text. */
  rows(): string[][] {
    return this.state.values
      .slice(0, this.getLastRow())
      .map((row) => row.map((cell) => String(cell)))
  }

  /** A person types into a cell (1-based coordinates). */
  type(row: number, column: number, text: string): void {
    this.getRange(row, column).setValues([[text]])
    this.writeCalls -= 1
  }

  commit(): void {
    this.durable = JSON.stringify(this.state)
  }

  rollback(): void {
    this.state = JSON.parse(this.durable) as SheetState
  }
}

export class FakeSpreadsheet {
  readonly sheets = new Map<string, FakeSheet>()
  readonly toasts: string[] = []

  getSheetByName(name: string): FakeSheet | null {
    return this.sheets.get(name) ?? null
  }

  insertSheet(name: string): FakeSheet {
    const sheet = new FakeSheet(name)
    this.sheets.set(name, sheet)
    return sheet
  }

  toast(message: string): void {
    this.toasts.push(message)
  }

  sheet(name: string): FakeSheet {
    const sheet = this.sheets.get(name)
    if (sheet === undefined) {
      throw new Error(`no sheet called ${name}`)
    }
    return sheet
  }
}

export interface MenuEntry {
  caption: string
  functionName: string
}

export class FakeUi {
  readonly ButtonSet = { OK: 'OK', OK_CANCEL: 'OK_CANCEL' }
  readonly Button = { OK: 'OK', CANCEL: 'CANCEL' }
  readonly alerts: string[] = []
  readonly menus = new Map<string, MenuEntry[]>()
  /** What the person clicks on the next OK/Cancel dialog. */
  nextAnswer: 'OK' | 'CANCEL' = 'OK'

  alert(_title: string, message: string): string {
    this.alerts.push(message)
    return this.nextAnswer
  }

  createMenu(title: string): FakeMenu {
    return new FakeMenu(this, title)
  }

  lastAlert(): string {
    return this.alerts[this.alerts.length - 1] ?? ''
  }
}

class FakeMenu {
  private readonly entries: MenuEntry[] = []

  constructor(
    private readonly ui: FakeUi,
    private readonly title: string
  ) {}

  addItem(caption: string, functionName: string): this {
    this.entries.push({ caption, functionName })
    return this
  }

  addSeparator(): this {
    return this
  }

  addToUi(): void {
    this.ui.menus.set(this.title, this.entries)
  }
}

class FakeValidationBuilder {
  private values: string[] = []
  private allowInvalid = true

  requireValueInList(values: string[]): this {
    this.values = values
    return this
  }

  setAllowInvalid(allow: boolean): this {
    this.allowInvalid = allow
    return this
  }

  build(): { values: string[]; allowInvalid: boolean } {
    return { values: this.values, allowInvalid: this.allowInvalid }
  }
}

export interface FakeTrigger {
  handler: string
  afterMs: number
  getHandlerFunction: () => string
}

interface FetchParams {
  method?: string
  headers?: Record<string, string>
  payload?: string
  contentType?: string
  muteHttpExceptions?: boolean
}

/** The whole simulated environment one test runs in. */
export class GasWorld {
  readonly clock = new FakeClock()
  readonly spreadsheet = new FakeSpreadsheet()
  readonly ui = new FakeUi()
  readonly properties = new Map<string, string>()
  readonly triggers: FakeTrigger[] = []
  readonly sleeps: number[] = []
  /** False while a time-driven trigger, not a person, is running the script. */
  interactive = true
  /** Simulated duration of one Drive API call. */
  latencyMs = 300
  /** Set while another execution holds the document lock. */
  lockHeldElsewhere = false
  lockHeld = false

  constructor(readonly drive: FakeDrive) {
    drive.onRequest = () => {
      this.clock.advance(this.latencyMs)
    }
  }

  /** The global variables an Apps Script project sees. */
  globals(): Record<string, unknown> {
    return {
      Date: fakeDateClass(this.clock),
      SpreadsheetApp: {
        getActiveSpreadsheet: () => this.spreadsheet,
        getUi: () => {
          if (!this.interactive) {
            throw new Error(
              'Cannot call SpreadsheetApp.getUi() from this context.'
            )
          }
          return this.ui
        },
        flush: () => {
          this.commit()
        },
        newDataValidation: () => new FakeValidationBuilder(),
      },
      UrlFetchApp: { fetch: this.fetch },
      ScriptApp: {
        getOAuthToken: () => FAKE_TOKEN,
        getProjectTriggers: () => [...this.triggers],
        deleteTrigger: (trigger: FakeTrigger) => {
          const index = this.triggers.indexOf(trigger)
          if (index !== -1) {
            this.triggers.splice(index, 1)
          }
        },
        newTrigger: (handler: string) => ({
          timeBased: () => ({
            after: (afterMs: number) => ({
              create: () => {
                const trigger: FakeTrigger = {
                  handler,
                  afterMs,
                  getHandlerFunction: () => handler,
                }
                this.triggers.push(trigger)
                return trigger
              },
            }),
          }),
        }),
      },
      PropertiesService: {
        getDocumentProperties: () => ({
          getProperty: (key: string) => this.properties.get(key) ?? null,
          setProperty: (key: string, value: string) => {
            this.properties.set(key, value)
          },
        }),
      },
      LockService: {
        getDocumentLock: () => ({
          tryLock: () => {
            if (this.lockHeldElsewhere || this.lockHeld) {
              return false
            }
            this.lockHeld = true
            return true
          },
          releaseLock: () => {
            this.lockHeld = false
          },
        }),
      },
      Utilities: {
        sleep: (milliseconds: number) => {
          this.sleeps.push(milliseconds)
          this.clock.advance(milliseconds)
        },
      },
    }
  }

  /** Everything written so far becomes durable. */
  commit(): void {
    for (const sheet of this.spreadsheet.sheets.values()) {
      sheet.commit()
    }
  }

  /** The execution was killed: unflushed sheet writes are lost, the lock freed. */
  crash(): void {
    for (const sheet of this.spreadsheet.sheets.values()) {
      sheet.rollback()
    }
    this.lockHeld = false
  }

  private readonly fetch = (
    url: string,
    params: FetchParams = {}
  ): { getResponseCode: () => number; getContentText: () => string } => {
    const method = (params.method ?? 'get').toUpperCase() as HttpMethod
    const authorised = params.headers?.Authorization === `Bearer ${FAKE_TOKEN}`
    const response = authorised
      ? this.drive.handle({
          method,
          url,
          ...(params.payload === undefined ? {} : { body: params.payload }),
        })
      : { status: 401, body: '{"error":{"message":"Invalid Credentials"}}' }
    if (
      params.payload !== undefined &&
      params.contentType !== 'application/json'
    ) {
      throw new Error('fake UrlFetchApp: JSON payload sent without contentType')
    }
    if (response.status >= 400 && params.muteHttpExceptions !== true) {
      throw new Error(
        `Request failed for ${url} returned code ${String(response.status)}`
      )
    }
    return {
      getResponseCode: () => response.status,
      getContentText: () => response.body,
    }
  }
}
