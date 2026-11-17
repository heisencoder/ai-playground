/**
 * Classification: decide what happens to each scanned item. Pure logic, no I/O.
 *
 *   folder                              -> CREATE_FOLDER (folders cannot be moved
 *                                          into a shared drive through the API)
 *   shortcut                            -> SHORTCUT (recreated, same target)
 *   mine, movable                       -> MOVE  (keeps ID, history, comments)
 *   mine, not movable                   -> COPY, or SKIP if it cannot be copied
 *   not mine, "try to move" enabled     -> MOVE  (executor falls back if refused)
 *   not mine                            -> COPY / SHORTCUT / SKIP per config
 */

import type { Action, Config, Item, OthersFilesPolicy } from './model'
import {
  FILE_OVERRIDES,
  UNCOPYABLE_MIMES,
  effectiveAction,
  isFolder,
  isShortcut,
} from './model'

export interface Decision {
  action: Action
  reason: string
}

type Classifiable = Pick<
  Item,
  'mimeType' | 'ownedByMe' | 'ownerEmail' | 'canCopy' | 'canMoveOut'
>

function ownerLabel(item: Classifiable): string {
  return item.ownerEmail === '' ? 'another user' : item.ownerEmail
}

/** Why the file cannot be copied, or '' when it can. */
export function copyBlocker(item: Classifiable): string {
  if (UNCOPYABLE_MIMES.has(item.mimeType)) {
    return 'this file type cannot be copied through the Drive API'
  }
  if (!item.canCopy) {
    return 'copying is disabled on the file'
  }
  return ''
}

/** What to do with a file the user does not own and will not (or cannot) move. */
export function fallbackForOthersFile(
  item: Classifiable,
  policy: OthersFilesPolicy
): Decision {
  const owner = ownerLabel(item)
  if (policy === 'SKIP') {
    return { action: 'SKIP', reason: `owned by ${owner}; configured to skip` }
  }
  if (policy === 'SHORTCUT') {
    return {
      action: 'SHORTCUT',
      reason: `owned by ${owner}; a shortcut to the original is created`,
    }
  }
  const blocker = copyBlocker(item)
  if (blocker !== '') {
    return { action: 'SKIP', reason: `owned by ${owner} and ${blocker}` }
  }
  return {
    action: 'COPY',
    reason: `owned by ${owner}; copied (revision history is lost)`,
  }
}

function classifyOwnFile(item: Classifiable): Decision {
  if (item.canMoveOut) {
    return {
      action: 'MOVE',
      reason: 'owned by me; a move keeps the file ID, history and comments',
    }
  }
  const blocker = copyBlocker(item)
  if (blocker !== '') {
    return {
      action: 'SKIP',
      reason: `owned by me but Drive will not let it be moved, and ${blocker}`,
    }
  }
  return {
    action: 'COPY',
    reason:
      'owned by me but Drive will not let it be moved; copied (history is lost)',
  }
}

export function classify(item: Classifiable, config: Config): Decision {
  if (isFolder(item)) {
    return {
      action: 'CREATE_FOLDER',
      reason: 'folders are recreated; only files can be moved',
    }
  }
  if (isShortcut(item)) {
    return {
      action: 'SHORTCUT',
      reason: 'shortcut recreated, pointing at the same target',
    }
  }
  if (item.ownedByMe) {
    return classifyOwnFile(item)
  }
  if (config.tryMoveOthersFiles) {
    const fallback = fallbackForOthersFile(item, config.othersFiles)
    return {
      action: 'MOVE',
      reason: `owned by ${ownerLabel(item)}; will try a move, else ${fallback.action}`,
    }
  }
  return fallbackForOthersFile(item, config.othersFiles)
}

/** Explains why an Override cell cannot be honoured, or '' when it can. */
export function overrideProblem(item: Item): string {
  if (item.override === '') {
    return ''
  }
  if (isFolder(item)) {
    return item.override === 'CREATE_FOLDER' || item.override === 'SKIP'
      ? ''
      : `a folder can only be CREATE_FOLDER or SKIP, not ${item.override}`
  }
  if (!FILE_OVERRIDES.includes(item.override)) {
    return `a file cannot be ${item.override}`
  }
  if (item.override === 'COPY') {
    const blocker = copyBlocker(item)
    return blocker === '' ? '' : `cannot COPY: ${blocker}`
  }
  return ''
}

export interface PlanCounts {
  total: number
  byAction: Record<Action, number>
}

function emptyCounts(): PlanCounts {
  return {
    total: 0,
    byAction: { CREATE_FOLDER: 0, MOVE: 0, COPY: 0, SHORTCUT: 0, SKIP: 0 },
  }
}

/**
 * Fills in `action` and `reason` on every item that is not finished, and makes
 * it PENDING (a dry run passes `keepStatus` so that it changes no real status).
 * DONE rows are left exactly as they are, so re-planning never undoes
 * completed work. Returns the items that changed.
 */
export function planItems(
  items: readonly Item[],
  config: Config,
  keepStatus = false
): { changed: Item[]; counts: PlanCounts } {
  const counts = emptyCounts()
  const changed: Item[] = []
  for (const item of items) {
    if (item.status !== 'DONE') {
      const decision = classify(item, config)
      const keep =
        item.status === 'IN_PROGRESS' || (keepStatus && item.status !== '')
      const status = keep ? item.status : 'PENDING'
      if (
        item.action !== decision.action ||
        item.reason !== decision.reason ||
        item.status !== status
      ) {
        item.action = decision.action
        item.reason = decision.reason
        item.status = status
        changed.push(item)
      }
    }
    const action = effectiveAction(item)
    if (action !== '') {
      counts.total += 1
      counts.byAction[action] += 1
    }
  }
  return { changed, counts }
}
