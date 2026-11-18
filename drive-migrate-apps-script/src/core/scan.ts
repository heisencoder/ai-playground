/**
 * Inventory: walk the source folder breadth-first and record every descendant.
 *
 * Read-only against Drive. Resumable: each folder row carries a scan state, so
 * a later execution simply continues with the folders still marked PENDING.
 */

import type { Budget } from './budget'
import { DriveError } from './errors'
import type { DriveFile, DrivePort, Item, NewItem, Store } from './model'
import { FOLDER_MIME, SHORTCUT_MIME, isFolder } from './model'

/** Push scanned rows to the sheet after this many folders. */
const FLUSH_EVERY_FOLDERS = 10

export interface ScanResult {
  complete: boolean
  /** Items recorded so far, across every execution of this scan. */
  total: number
  added: number
  /** Folders that could not be listed during this execution. */
  errors: number
}

interface ParentRef {
  id: string
  path: string
  depth: number
}

function sizeOf(file: DriveFile): number | null {
  const size = file.size === undefined ? Number.NaN : Number(file.size)
  return Number.isFinite(size) ? size : null
}

/** The mutable columns of a freshly scanned row: nothing planned or done yet. */
function untouched(): Pick<
  NewItem,
  | 'action'
  | 'reason'
  | 'override'
  | 'status'
  | 'destId'
  | 'destPreExisting'
  | 'result'
  | 'dryRun'
  | 'dryDestId'
  | 'dryPreExisting'
  | 'updatedAt'
> {
  return {
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

function ownership(
  file: DriveFile
): Pick<NewItem, 'ownerEmail' | 'ownerName' | 'ownedByMe'> {
  const owner = file.owners?.[0]
  return {
    ownerEmail: owner?.emailAddress ?? '',
    ownerName: owner?.displayName ?? '',
    ownedByMe: file.ownedByMe ?? false,
  }
}

function facts(
  file: DriveFile
): Pick<
  NewItem,
  'createdTime' | 'modifiedTime' | 'canCopy' | 'canMoveOut' | 'webViewLink'
> {
  return {
    createdTime: file.createdTime ?? '',
    modifiedTime: file.modifiedTime ?? '',
    canCopy: file.capabilities?.canCopy ?? true,
    // If Drive does not say, assume an owner may move their own file; the
    // executor copes with being refused.
    canMoveOut:
      file.capabilities?.canMoveItemOutOfDrive ?? file.ownedByMe ?? false,
    webViewLink: file.webViewLink ?? '',
  }
}

export function toNewItem(file: DriveFile, parent: ParentRef | null): NewItem {
  const name = file.name ?? '(unnamed)'
  const mimeType = file.mimeType ?? ''
  const isShortcutFile = mimeType === SHORTCUT_MIME
  return {
    id: file.id,
    path: parent === null ? name : `${parent.path}/${name}`,
    name,
    mimeType,
    parentId: parent === null ? '' : parent.id,
    depth: parent === null ? 0 : parent.depth + 1,
    ...ownership(file),
    size: sizeOf(file),
    ...facts(file),
    shortcutTargetId: isShortcutFile
      ? (file.shortcutDetails?.targetId ?? '')
      : '',
    scanState: mimeType === FOLDER_MIME ? 'PENDING' : '',
    ...untouched(),
  }
}

/** Folders first, then by name, so the sheet reads like a file browser. */
function byKindThenName(a: DriveFile, b: DriveFile): number {
  const aFolder = a.mimeType === FOLDER_MIME ? 0 : 1
  const bFolder = b.mimeType === FOLDER_MIME ? 0 : 1
  if (aFolder !== bFolder) {
    return aFolder - bFolder
  }
  return (a.name ?? '').localeCompare(b.name ?? '')
}

/** Empties the inventory and records the source folder itself as row one. */
export function startScan(store: Store, sourceFolder: DriveFile): void {
  store.clearItems()
  store.appendItems([toNewItem(sourceFolder, null)])
  store.setMeta('scan', 'RUNNING')
  store.flush()
}

export function continueScan(
  drive: DrivePort,
  store: Store,
  budget: Budget
): ScanResult {
  const items = store.readItems()
  const seen = new Set(items.map((item) => item.id))
  const queue: Item[] = items.filter(
    (item) => isFolder(item) && item.scanState === 'PENDING'
  )
  const result: ScanResult = {
    complete: false,
    total: items.length,
    added: 0,
    errors: 0,
  }

  let sinceFlush = 0
  for (
    let folder = queue.shift();
    folder !== undefined;
    folder = queue.shift()
  ) {
    if (budget.expired()) {
      queue.unshift(folder)
      break
    }
    const children = listOrNote(drive, store, folder, result)
    const fresh: NewItem[] = []
    for (const child of children.sort(byKindThenName)) {
      if (seen.has(child.id)) {
        store.log(
          'WARN',
          `"${child.name ?? child.id}" appears in more than one place; kept only its first location.`
        )
      } else {
        seen.add(child.id)
        fresh.push(toNewItem(child, folder))
      }
    }
    const appended = store.appendItems(fresh)
    queue.push(...appended.filter((item) => isFolder(item)))
    if (folder.scanState !== 'ERROR') {
      folder.scanState = 'DONE'
    }
    store.writeItems([folder])
    result.added += appended.length
    result.total += appended.length
    sinceFlush += 1
    if (sinceFlush >= FLUSH_EVERY_FOLDERS) {
      store.flush()
      sinceFlush = 0
    }
  }

  result.complete = queue.length === 0
  if (result.complete) {
    store.setMeta('scan', 'DONE')
  }
  store.flush()
  return result
}

function listOrNote(
  drive: DrivePort,
  store: Store,
  folder: Item,
  result: ScanResult
): DriveFile[] {
  try {
    return drive.listChildren(folder.id)
  } catch (error) {
    if (!(error instanceof DriveError)) {
      throw error
    }
    result.errors += 1
    // Not DONE: its contents are unknown, and the executor must not treat the
    // folder as migrated just because it could create an empty one.
    folder.scanState = 'ERROR'
    folder.result = `could not list this folder: ${error.message}`
    store.log('ERROR', `${folder.path}: ${folder.result}`)
    return []
  }
}
