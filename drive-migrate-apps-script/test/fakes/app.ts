/**
 * Two ways of running the tool against a simulated Apps Script environment:
 *
 *   directApp   imports the TypeScript sources, with the fake services
 *               installed as globals of the test process (this is what gives
 *               line coverage);
 *   bundledApp  loads the generated `dist/Code.js` into a fresh global scope
 *               that contains nothing but the fake services, exactly as the
 *               Apps Script runtime would load the pasted file.
 *
 * The same behavioural tests run against both.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { vi } from 'vitest'
import { CONFIG_FIELDS } from '../../src/core/config'
import type { ConfigKey } from '../../src/core/config'
import * as entryPoints from '../../src/index'
import { ITEM_COLUMNS, SHEET_NAMES } from '../../src/gas/sheetStore'
import type { FakeDrive } from './fakeDrive'
import { GasWorld } from './fakeGas'
import type { Scenario } from './scenario'

export const BUNDLE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../dist/Code.js'
)

export type AppKind = 'sources' | 'bundle'

export interface App {
  kind: AppKind
  world: GasWorld
  /** Calls a top-level function, as the menu or a trigger would. */
  call: (name: string) => void
  has: (name: string) => boolean
  /** Names of all top-level functions the script defines. */
  functions: () => string[]
}

function directApp(world: GasWorld): App {
  for (const [name, value] of Object.entries(world.globals())) {
    vi.stubGlobal(name, value)
  }
  const table = entryPoints as Record<string, (() => void) | undefined>
  return {
    kind: 'sources',
    world,
    has: (name) => typeof table[name] === 'function',
    functions: () => Object.keys(table),
    call: (name) => {
      const entry = table[name]
      if (entry === undefined) {
        throw new Error(`no entry point ${name}`)
      }
      entry()
    },
  }
}

function bundledApp(world: GasWorld): App {
  const provided = world.globals()
  const context = vm.createContext({ ...provided })
  vm.runInContext(readFileSync(BUNDLE_PATH, 'utf8'), context, {
    filename: 'Code.js',
  })
  const table = context as Record<string, unknown>
  return {
    kind: 'bundle',
    world,
    has: (name) => typeof table[name] === 'function',
    functions: () =>
      Object.keys(table).filter(
        (name) => typeof table[name] === 'function' && !(name in provided)
      ),
    call: (name) => {
      const entry = table[name]
      if (typeof entry !== 'function') {
        throw new Error(`Script function not found: ${name}`)
      }
      ;(entry as () => void)()
    },
  }
}

export function startApp(kind: AppKind, drive: FakeDrive): App {
  const world = new GasWorld(drive)
  return kind === 'bundle' ? bundledApp(world) : directApp(world)
}

/** Runs "Set up sheets" and fills in the Config sheet as a person would. */
export function setUpWorkbook(
  app: App,
  scenario: Scenario,
  config: Partial<Record<ConfigKey, string>> = {}
): void {
  app.call('setUpSheets')
  typeConfig(app, {
    sourceId: scenario.sourceId,
    destinationId: scenario.sharedDriveId,
    ...config,
  })
}

export function typeConfig(
  app: App,
  config: Partial<Record<ConfigKey, string>>
): void {
  const sheet = app.world.spreadsheet.sheet(SHEET_NAMES.config)
  const labels = sheet.rows().map((row) => row[0])
  for (const field of CONFIG_FIELDS) {
    const value = config[field.key]
    if (value !== undefined) {
      sheet.type(labels.indexOf(field.label) + 1, 2, value)
    }
  }
  app.world.commit()
}

export type ItemRow = Record<string, string>

/** The Items sheet as a person reads it: one record per row, keyed by header. */
export function itemRows(app: App): ItemRow[] {
  const [, ...rows] = app.world.spreadsheet.sheet(SHEET_NAMES.items).rows()
  return rows.map((cells) =>
    Object.fromEntries(
      ITEM_COLUMNS.map((column, index) => [column.header, cells[index] ?? ''])
    )
  )
}

export function itemRow(app: App, path: string): ItemRow {
  const row = itemRows(app).find((candidate) => candidate.Path === path)
  if (row === undefined) {
    throw new Error(`no Items row for ${path}`)
  }
  return row
}

/** A person types into a cell of the Items sheet. */
export function typeItemCell(
  app: App,
  path: string,
  header: string,
  text: string
): void {
  const sheet = app.world.spreadsheet.sheet(SHEET_NAMES.items)
  const row = itemRows(app).findIndex((candidate) => candidate.Path === path)
  const column = ITEM_COLUMNS.findIndex(
    (candidate) => candidate.header === header
  )
  sheet.type(row + 2, column + 1, text)
  app.world.commit()
}

/**
 * Time passes and the scheduled trigger fires, with nobody at the keyboard.
 * Returns how many trigger runs it took until none was scheduled any more.
 */
export function fireTriggersUntilQuiet(app: App, maxRuns = 50): number {
  let runs = 0
  while (app.world.triggers.length > 0) {
    if (runs >= maxRuns) {
      throw new Error('triggers never stopped firing')
    }
    const [trigger] = app.world.triggers
    if (trigger === undefined) {
      break
    }
    app.world.clock.advance(trigger.afterMs)
    app.world.interactive = false
    try {
      app.call(trigger.handler)
    } finally {
      app.world.interactive = true
    }
    runs += 1
  }
  return runs
}
