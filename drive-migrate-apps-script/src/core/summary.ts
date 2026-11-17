/** Builds the Summary sheet: what the plan holds and how far the migration is. */

import type { Action, Item, Status } from './model'
import { ACTIONS, STATUSES, effectiveAction, isFolder } from './model'

const BYTES_PER_UNIT = 1024
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= BYTES_PER_UNIT && unit < UNITS.length - 1) {
    value /= BYTES_PER_UNIT
    unit += 1
  }
  const text = unit === 0 ? String(value) : value.toFixed(1)
  return `${text} ${UNITS[unit] ?? ''}`
}

interface OwnerTotals {
  files: number
  bytes: number
  moved: number
  copied: number
}

function ownerTotals(items: readonly Item[]): Map<string, OwnerTotals> {
  const totals = new Map<string, OwnerTotals>()
  for (const item of items) {
    if (isFolder(item)) {
      continue
    }
    const owner = item.ownerEmail === '' ? '(unknown)' : item.ownerEmail
    const entry = totals.get(owner) ?? {
      files: 0,
      bytes: 0,
      moved: 0,
      copied: 0,
    }
    const action = effectiveAction(item)
    entry.files += 1
    entry.bytes += item.size ?? 0
    entry.moved += action === 'MOVE' ? 1 : 0
    entry.copied += action === 'COPY' ? 1 : 0
    totals.set(owner, entry)
  }
  return totals
}

function countBy<T extends string>(
  keys: readonly T[],
  values: readonly (T | '')[]
): [T, number][] {
  return keys.map((key) => [
    key,
    values.filter((value) => value === key).length,
  ])
}

export function buildSummary(
  items: readonly Item[],
  headline: string,
  generatedAt: string
): string[][] {
  const rows: string[][] = [
    ['Drive migration summary', generatedAt],
    [headline, ''],
    ['', ''],
    ['Planned action', 'Items'],
  ]
  const actions = countBy<Action>(ACTIONS, items.map(effectiveAction))
  for (const [action, count] of actions) {
    rows.push([action, String(count)])
  }
  rows.push(['', ''], ['Status', 'Items'])
  const statuses = countBy<Status>(
    STATUSES,
    items.map((item) => item.status)
  )
  for (const [status, count] of statuses) {
    rows.push([status, String(count)])
  }
  rows.push(
    ['', ''],
    ['Owner', 'Files', 'Size', 'Moved (history kept)', 'Copied (history lost)']
  )
  const owners = [...ownerTotals(items).entries()].sort(
    (a, b) => b[1].files - a[1].files
  )
  for (const [owner, total] of owners) {
    rows.push([
      owner,
      String(total.files),
      formatBytes(total.bytes),
      String(total.moved),
      String(total.copied),
    ])
  }
  return rows
}
