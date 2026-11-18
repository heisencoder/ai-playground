import type {
  Item,
  LogLevel,
  MetaKey,
  NewItem,
  Store,
} from '../../src/core/model'

interface Durable {
  items: Item[]
  meta: Record<string, string>
}

/**
 * A `Store` held in memory, for testing the core without a spreadsheet. Like
 * the real one, item writes only become durable at `flush()`; `crash()` drops
 * anything written since. (Meta entries are durable at once, as document
 * properties are.) `readItems` hands out copies, as re-reading a sheet would.
 */
export class MemoryStore implements Store {
  config: Record<string, string> = {}
  readonly logs: { level: LogLevel; message: string }[] = []
  summary: string[][] = []
  writeCalls = 0
  private items: Item[] = []
  private readonly keptOverrides = new Map<string, Item['override']>()
  private readonly meta: Record<string, string> = {}
  private durable: Durable = { items: [], meta: {} }

  readConfigValues(): Record<string, string> {
    return { ...this.config }
  }

  readItems(): Item[] {
    return this.items.map((item) => ({ ...item }))
  }

  appendItems(newItems: NewItem[]): Item[] {
    const appended = newItems.map((item, index): Item => ({
      ...item,
      override: this.keptOverrides.get(item.id) ?? item.override,
      row: this.items.length + 2 + index,
    }))
    this.items.push(...appended.map((item) => ({ ...item })))
    return appended
  }

  writeItems(items: readonly Item[]): void {
    this.writeCalls += 1
    for (const item of items) {
      const index = this.items.findIndex((held) => held.row === item.row)
      const held = this.items[index]
      if (held === undefined) {
        throw new Error(`no row ${String(item.row)}`)
      }
      // The Override column belongs to the person, not the tool.
      this.items[index] = { ...item, override: held.override }
    }
  }

  clearItems(): void {
    for (const item of this.items) {
      if (item.override === '') {
        this.keptOverrides.delete(item.id)
      } else {
        this.keptOverrides.set(item.id, item.override)
      }
    }
    this.items = []
  }

  getMeta(key: MetaKey): string {
    return this.meta[key] ?? ''
  }

  setMeta(key: MetaKey, value: string): void {
    this.meta[key] = value
  }

  log(level: LogLevel, message: string): void {
    this.logs.push({ level, message })
  }

  writeSummary(rows: string[][]): void {
    this.summary = rows
  }

  flush(): void {
    this.durable = {
      items: this.items.map((item) => ({ ...item })),
      meta: { ...this.meta },
    }
  }

  // -- test helpers ----------------------------------------------------------

  crash(): void {
    this.items = this.durable.items.map((item) => ({ ...item }))
  }

  /** The row for a path, straight from storage. */
  at(path: string): Item {
    const item = this.items.find((held) => held.path === path)
    if (item === undefined) {
      throw new Error(`no item at ${path}`)
    }
    return item
  }

  /** A person types into the Override column. */
  override(path: string, action: Item['override']): void {
    this.at(path).override = action
  }

  statuses(): Record<string, string> {
    return Object.fromEntries(
      this.items.map((item) => [item.path, item.status])
    )
  }
}
