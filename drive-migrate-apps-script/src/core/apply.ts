/**
 * The executor: carries out the plan, or (in a dry run) reports what it would do.
 *
 * Both modes run the same code path, including destination-folder resolution
 * and duplicate detection; a dry run only replaces each write with a
 * placeholder ID and records its findings in the "Dry run" column instead of
 * the Status column.
 *
 * Restart safety. Work is done in small batches. Before a batch touches Drive
 * its rows are written to the sheet as IN_PROGRESS; afterwards the outcomes are
 * written. If an execution dies in between, the next one finds IN_PROGRESS rows
 * and asks Drive what really happened (a moved file is already in the
 * destination; a copy or new folder carries the source ID in a custom file
 * property) before doing anything, so nothing is done twice.
 */

import type { Budget } from './budget'
import {
  NATIVE_COMMENT_MIMES,
  carryComments,
  describeComments,
} from './comments'
import { normalizePath } from './config'
import { DriveError, errorMessage } from './errors'
import type {
  Action,
  Config,
  DriveFile,
  DrivePort,
  Item,
  Status,
  Store,
} from './model'
import {
  FOLDER_MIME,
  SHORTCUT_MIME,
  SOURCE_ID_PROPERTY,
  effectiveAction,
  isFolder,
  isShortcut,
} from './model'
import { copyBlocker, fallbackForOthersFile, overrideProblem } from './plan'

export type Mode = 'DRY_RUN' | 'EXECUTE'

export const DRY_ID_PREFIX = 'dryrun:'
const EXECUTE_BATCH = 10
const DRY_RUN_BATCH = 200
const HTTP_FORBIDDEN = 403
const HTTP_NOT_FOUND = 404
const DATE_LENGTH = 10
/**
 * 403 reasons that say "not now" or "no room", not "you may not move this".
 * Falling back to a copy for these would throw history away for nothing.
 */
const NOT_A_REFUSAL: ReadonlySet<string> = new Set([
  'rateLimitExceeded',
  'userRateLimitExceeded',
  'sharingRateLimitExceeded',
  'teamDrivesParentLimit',
  'teamDriveFileLimitExceeded',
  'storageQuotaExceeded',
])

type Kind =
  | 'folderCreated'
  | 'folderAdopted'
  | 'moved'
  | 'copied'
  | 'shortcut'
  | 'skipped'
  | 'failed'
  | 'blocked'
  | 'partial'

const KIND_STATUS: Record<Kind, Status> = {
  folderCreated: 'DONE',
  folderAdopted: 'DONE',
  moved: 'DONE',
  copied: 'DONE',
  shortcut: 'DONE',
  skipped: 'SKIPPED',
  failed: 'FAILED',
  blocked: 'BLOCKED',
  partial: 'IN_PROGRESS',
}

interface Outcome {
  kind: Kind
  message: string
  destId?: string
  preExisting?: boolean
}

export type ApplyCounts = Record<Kind, number>

export interface ApplyResult {
  mode: Mode
  complete: boolean
  processed: number
  remaining: number
  counts: ApplyCounts
}

export interface ApplyDeps {
  drive: DrivePort
  store: Store
  config: Config
  budget: Budget
  /** ID of the shared drive (or folder inside one) that receives the content. */
  destRootId: string
  /** ID of the shared drive itself, used to scope destination listings. */
  destDriveId: string
  /** Current time as an ISO string, for the "Updated" column. */
  timestamp: () => string
}

interface DestParent {
  id: string
  /** True when the folder may already hold content this run did not put there. */
  preExisting: boolean
}

const DRY_SKIP = 'would skip: '
const DRY_BLOCKED = 'blocked: '
const DRY_ERROR = 'error: '

/** Text for the "Dry run" column. Kept next to {@link dryStatusOf}, its inverse. */
export function formatDryRun(kind: Kind, message: string): string {
  switch (KIND_STATUS[kind]) {
    case 'SKIPPED':
      return DRY_SKIP + message
    case 'BLOCKED':
      return DRY_BLOCKED + message
    case 'FAILED':
      return DRY_ERROR + message
    default:
      return message
  }
}

export function dryStatusOf(item: Item): Status | '' {
  const text = item.dryRun
  if (text === '') {
    return ''
  }
  if (text.startsWith(DRY_SKIP)) {
    return 'SKIPPED'
  }
  if (text.startsWith(DRY_BLOCKED)) {
    return 'BLOCKED'
  }
  return text.startsWith(DRY_ERROR) ? 'FAILED' : 'DONE'
}

/** Whether `path` is the filter path, beneath it, or one of its ancestors. */
export function inScope(path: string, filter: string): boolean {
  if (filter === '') {
    return true
  }
  const normal = normalizePath(path)
  return (
    normal === filter ||
    normal.startsWith(`${filter}/`) ||
    filter.startsWith(`${normal}/`)
  )
}

export function provenance(item: Item, today: string): string {
  const owner = `${item.ownerName} <${item.ownerEmail === '' ? 'unknown' : item.ownerEmail}>`
  const parts = [
    `Copied into this shared drive on ${today.slice(0, DATE_LENGTH)}.`,
    `Original owner: ${owner.trim()}.`,
    `Original created: ${item.createdTime.slice(0, DATE_LENGTH)}; last modified: ${item.modifiedTime.slice(0, DATE_LENGTH)}.`,
  ]
  if (item.webViewLink !== '') {
    parts.push(`Original file: ${item.webViewLink}`)
  }
  parts.push(
    'Revision history could not be carried over because the original was copied, not moved.'
  )
  return parts.join(' ')
}

function emptyCounts(): ApplyCounts {
  return {
    folderCreated: 0,
    folderAdopted: 0,
    moved: 0,
    copied: 0,
    shortcut: 0,
    skipped: 0,
    failed: 0,
    blocked: 0,
    partial: 0,
  }
}

function sourceIdOf(file: DriveFile): string {
  return file.properties?.[SOURCE_ID_PROPERTY] ?? ''
}

/** Forgets earlier dry-run findings. Returns the rows it changed. */
export function clearDryRun(items: readonly Item[]): Item[] {
  const changed: Item[] = []
  for (const item of items) {
    if (item.dryRun !== '' || item.dryDestId !== '' || item.dryPreExisting) {
      item.dryRun = ''
      item.dryDestId = ''
      item.dryPreExisting = false
      changed.push(item)
    }
  }
  return changed
}

export class Applier {
  private readonly byId = new Map<string, Item>()
  /** Every source ID and every destination ID this migration knows about. */
  private readonly ownIds = new Set<string>()
  private readonly childrenCache = new Map<string, DriveFile[]>()
  /** Destination folders this run created or found in a fresh listing. */
  private readonly trusted = new Set<string>()
  private readonly folderProblems = new Map<string, string>()
  private readonly counts = emptyCounts()
  private readonly dry: boolean

  constructor(
    private readonly deps: ApplyDeps,
    private readonly mode: Mode,
    private readonly items: readonly Item[]
  ) {
    this.dry = mode === 'DRY_RUN'
    for (const item of items) {
      this.byId.set(item.id, item)
      this.ownIds.add(item.id)
      if (item.destId !== '') {
        this.ownIds.add(item.destId)
      }
    }
  }

  run(): ApplyResult {
    const { budget, store } = this.deps
    const todo = this.worklist()
    const batchSize = this.dry ? DRY_RUN_BATCH : EXECUTE_BATCH
    let processed = 0

    for (let start = 0; start < todo.length; start += batchSize) {
      if (budget.expired()) {
        break
      }
      const batch = todo.slice(start, start + batchSize)
      // Rows an earlier attempt may have got part-way through.
      const recovering = new Set(
        batch.filter(
          (item) => item.status === 'IN_PROGRESS' || item.status === 'FAILED'
        )
      )
      if (!this.dry) {
        this.markInProgress(batch)
      }
      for (const item of batch) {
        if (budget.expired()) {
          // Untouched rows go back to how they were found.
          if (!this.dry && !recovering.has(item)) {
            item.status = 'PENDING'
          }
        } else {
          this.record(item, this.process(item, recovering.has(item)))
          processed += 1
        }
      }
      store.writeItems(batch)
      store.flush()
    }

    const remaining = this.worklist().length
    return {
      mode: this.mode,
      complete: remaining === 0,
      processed,
      remaining,
      counts: this.counts,
    }
  }

  /** Rows still to handle, in the order they must be handled. */
  private worklist(): Item[] {
    const filter = this.deps.config.pathFilter
    const open = this.items.filter(
      (item) => inScope(item.path, filter) && this.isOpen(item)
    )
    // Parents before children even if someone has sorted the sheet; shortcuts
    // last so that a shortcut to a copied file can point at the copy.
    const rank = (item: Item): number => (isShortcut(item) ? 1 : 0)
    return open.sort(
      (a, b) => rank(a) - rank(b) || a.depth - b.depth || a.row - b.row
    )
  }

  private isOpen(item: Item): boolean {
    if (this.dry) {
      return item.dryRun === ''
    }
    return (
      item.status === 'PENDING' ||
      item.status === 'IN_PROGRESS' ||
      item.status === ''
    )
  }

  private markInProgress(batch: readonly Item[]): void {
    for (const item of batch) {
      item.status = 'IN_PROGRESS'
    }
    this.deps.store.writeItems(batch)
    this.deps.store.flush()
  }

  private record(item: Item, outcome: Outcome): void {
    this.counts[outcome.kind] += 1
    const destId = outcome.destId ?? ''
    const preExisting = outcome.preExisting ?? false
    if (this.dry) {
      item.dryRun = formatDryRun(outcome.kind, outcome.message)
      item.dryDestId = destId
      item.dryPreExisting = preExisting
    } else {
      item.status = KIND_STATUS[outcome.kind]
      item.destId = destId
      item.destPreExisting = preExisting
      item.result = outcome.message
      item.updatedAt = this.deps.timestamp()
      if (destId !== '') {
        this.ownIds.add(destId)
      }
    }
    if (isFolder(item) && destId !== '') {
      this.trusted.add(destId)
    }
    if (outcome.kind === 'failed') {
      this.deps.store.log('ERROR', `${item.path}: ${outcome.message}`)
    }
  }

  private process(item: Item, recovering: boolean): Outcome {
    if (item.status === 'DONE') {
      return this.alreadyMigrated(item)
    }
    const action = effectiveAction(item)
    if (action === '') {
      return { kind: 'failed', message: 'not planned yet; run Scan again' }
    }
    const problem = overrideProblem(item)
    if (problem !== '') {
      return { kind: 'failed', message: `Override: ${problem}` }
    }
    if (action === 'SKIP') {
      return {
        kind: 'skipped',
        message: item.override === 'SKIP' ? 'skipped by override' : item.reason,
      }
    }
    if (item.scanState === 'ERROR') {
      return {
        kind: 'failed',
        message:
          'its contents could not be listed during the scan; run "Scan and plan" again',
      }
    }
    try {
      const parent = this.destParentOf(item)
      return 'kind' in parent
        ? parent
        : this.perform(action, item, parent, recovering)
    } catch (error) {
      if (!(error instanceof DriveError)) {
        throw error
      }
      return { kind: 'failed', message: error.message }
    }
  }

  /** A dry run reports rows the real migration has already finished. */
  private alreadyMigrated(item: Item): Outcome {
    return {
      kind: isFolder(item) ? 'folderAdopted' : 'moved',
      message: 'already migrated',
      destId: item.destId,
      preExisting: item.destPreExisting,
    }
  }

  /**
   * The destination folder the item goes into, or the outcome that explains
   * why it cannot go anywhere (its parent folder was skipped or failed).
   */
  private destParentOf(item: Item): DestParent | Outcome {
    if (item.parentId === '') {
      const problem = this.folderProblem(this.deps.destRootId)
      return problem === ''
        ? { id: this.deps.destRootId, preExisting: true }
        : { kind: 'blocked', message: problem }
    }
    const blocked: Outcome = {
      kind: 'blocked',
      message: 'the parent folder has not been created',
    }
    const parent = this.byId.get(item.parentId)
    if (parent === undefined) {
      return blocked
    }
    // A folder the real migration finished counts in a dry run as well.
    const real = parent.status === 'DONE'
    const status = real ? 'DONE' : this.liveStatus(parent)
    if (status === 'SKIPPED') {
      return { kind: 'skipped', message: 'the parent folder was skipped' }
    }
    const id = real ? parent.destId : parent.dryDestId
    if (status !== 'DONE' || id === '') {
      return blocked
    }
    const problem = this.folderProblem(id)
    if (problem !== '') {
      return { kind: 'blocked', message: problem }
    }
    return {
      id,
      preExisting: real ? parent.destPreExisting : parent.dryPreExisting,
    }
  }

  /**
   * Checks, once per run, that a destination folder recorded by an earlier run
   * is still there. Someone may have trashed it since, and a file moved into a
   * trashed folder would be deleted along with it.
   */
  private folderProblem(folderId: string): string {
    if (this.isVirtual(folderId) || this.trusted.has(folderId)) {
      return ''
    }
    let problem = this.folderProblems.get(folderId)
    if (problem === undefined) {
      problem = this.inspectFolder(folderId)
      this.folderProblems.set(folderId, problem)
    }
    return problem
  }

  private inspectFolder(folderId: string): string {
    const advice = '; run "Scan and plan" again'
    try {
      const folder = this.deps.drive.getFile(folderId)
      if (folder.trashed === true) {
        return `its destination folder is in the trash${advice}`
      }
      const drive = folder.driveId ?? ''
      return drive === this.deps.destDriveId
        ? ''
        : `its destination folder is not in the destination shared drive${advice}`
    } catch (error) {
      if (error instanceof DriveError && error.status === HTTP_NOT_FOUND) {
        return `its destination folder no longer exists${advice}`
      }
      throw error
    }
  }

  private liveStatus(item: Item): Status | '' {
    return this.dry ? dryStatusOf(item) : item.status
  }

  private perform(
    action: Exclude<Action, 'SKIP'>,
    item: Item,
    parent: DestParent,
    recovering: boolean
  ): Outcome {
    if (action === 'CREATE_FOLDER') {
      return this.createFolder(item, parent, recovering)
    }
    if (isFolder(item)) {
      return { kind: 'failed', message: `a folder cannot be ${action}` }
    }
    const found = this.lookFor(item, parent, recovering)
    if (found !== null) {
      return found
    }
    switch (action) {
      case 'MOVE':
        return this.move(item, parent)
      case 'COPY':
        return this.copy(item, parent)
      case 'SHORTCUT':
        return this.shortcut(item, parent)
      default:
        return { kind: 'failed', message: `unknown action ${String(action)}` }
    }
  }

  // -- destination lookups ---------------------------------------------------

  private isVirtual(parentId: string): boolean {
    return parentId.startsWith(DRY_ID_PREFIX)
  }

  private childrenOf(parentId: string): DriveFile[] {
    if (this.isVirtual(parentId)) {
      return []
    }
    let children = this.childrenCache.get(parentId)
    if (children === undefined) {
      children = this.deps.drive
        .listChildren(parentId, this.deps.destDriveId)
        .filter((child) => child.trashed !== true)
      this.childrenCache.set(parentId, children)
    }
    return children
  }

  private remember(parentId: string, child: DriveFile): void {
    this.childrenCache.get(parentId)?.push(child)
  }

  /**
   * Checks the destination folder for evidence that this file has been handled
   * already, or that a same-named file is in the way. Only needed when the
   * folder existed before this run created it, or when recovering.
   */
  private lookFor(
    item: Item,
    parent: DestParent,
    recovering: boolean
  ): Outcome | null {
    if (!parent.preExisting && !recovering) {
      return null
    }
    const children = this.childrenOf(parent.id)
    const moved = children.find((child) => child.id === item.id)
    if (moved !== undefined) {
      return {
        kind: 'moved',
        message: 'already in the destination',
        destId: item.id,
      }
    }
    const mine = children.find((child) => sourceIdOf(child) === item.id)
    if (mine !== undefined) {
      return this.foundOurs(item, mine)
    }
    if (this.deps.config.allowDuplicateNames) {
      return null
    }
    const clash = children.find(
      (child) =>
        child.name === item.name &&
        child.mimeType !== FOLDER_MIME &&
        sourceIdOf(child) === '' &&
        !this.ownIds.has(child.id)
    )
    return clash === undefined
      ? null
      : {
          kind: 'skipped',
          message:
            'a file with the same name is already in the destination folder',
        }
  }

  /**
   * The destination already holds something this tool made from the item. What
   * it is decides what is left to do, whatever the row's planned action says
   * (a planned move may have fallen back to a copy).
   */
  private foundOurs(item: Item, ours: DriveFile): Outcome {
    if (ours.mimeType === SHORTCUT_MIME) {
      return {
        kind: 'shortcut',
        message: 'already in the destination',
        destId: ours.id,
      }
    }
    // A copy may have been cut short while its comments were carried over.
    return this.dry
      ? { kind: 'copied', message: 'already copied', destId: ours.id }
      : this.finishCopy(item, ours.id)
  }

  // -- actions ---------------------------------------------------------------

  private createFolder(
    item: Item,
    parent: DestParent,
    recovering: boolean
  ): Outcome {
    if (item.parentId === '' && !this.deps.config.createRootFolder) {
      return {
        kind: 'folderAdopted',
        message:
          this.say('merged into', 'would merge into') + ' the destination',
        destId: parent.id,
        preExisting: true,
      }
    }
    if (parent.preExisting || recovering) {
      const folders = this.childrenOf(parent.id).filter(
        (child) => child.mimeType === FOLDER_MIME
      )
      const existing =
        folders.find((child) => sourceIdOf(child) === item.id) ??
        folders.find(
          (child) => child.name === item.name && sourceIdOf(child) === ''
        )
      if (existing !== undefined) {
        return {
          kind: 'folderAdopted',
          message:
            this.say('merged into', 'would merge into') + ' an existing folder',
          destId: existing.id,
          preExisting: true,
        }
      }
    }
    if (this.dry) {
      return {
        kind: 'folderCreated',
        message: 'would create folder',
        destId: DRY_ID_PREFIX + item.id,
      }
    }
    const created = this.deps.drive.createFolder(item.name, parent.id, item.id)
    this.remember(parent.id, created)
    return {
      kind: 'folderCreated',
      message: 'folder created',
      destId: created.id,
    }
  }

  private move(item: Item, parent: DestParent): Outcome {
    if (this.dry) {
      return {
        kind: 'moved',
        message: item.ownedByMe
          ? 'would move (keeps ID, history and comments)'
          : `would try to move; if refused: ${fallbackForOthersFile(item, this.deps.config.othersFiles).action}`,
        destId: item.id,
      }
    }
    // Look before moving: the file may have been moved, trashed, or (after an
    // interrupted run) already delivered since the scan recorded where it was.
    const current = this.deps.drive.getFile(item.id)
    const parents = current.parents ?? []
    if (parents.includes(parent.id)) {
      return {
        kind: 'moved',
        message: 'already in the destination',
        destId: item.id,
      }
    }
    if (current.trashed === true) {
      return { kind: 'skipped', message: 'in the trash since the scan' }
    }
    if (!parents.includes(item.parentId)) {
      return {
        kind: 'failed',
        message:
          'no longer in the folder it was scanned in; run "Scan and plan" again',
      }
    }
    try {
      // A shared drive item has exactly one parent, so every old one goes.
      this.deps.drive.moveFile(item.id, parent.id, parents)
    } catch (error) {
      const refused =
        error instanceof DriveError &&
        error.status === HTTP_FORBIDDEN &&
        !NOT_A_REFUSAL.has(error.reason)
      if (!refused) {
        throw error
      }
      return this.moveRefused(item, parent, error)
    }
    return { kind: 'moved', message: 'moved', destId: item.id }
  }

  /** Drive said no to a move. Fall back as configured, unless overridden. */
  private moveRefused(
    item: Item,
    parent: DestParent,
    error: DriveError
  ): Outcome {
    const refusal = `move refused (${error.reason === '' ? error.message : error.reason})`
    // An explicit Override: MOVE means "move or tell me", so no fallback then.
    let fallback: Action | null = null
    if (item.override === '' && !item.ownedByMe) {
      const decision = fallbackForOthersFile(item, this.deps.config.othersFiles)
      if (decision.action === 'SKIP') {
        return { kind: 'skipped', message: `${refusal}; ${decision.reason}` }
      }
      fallback = decision.action
    } else if (
      item.override === '' &&
      this.deps.config.moveRefused === 'COPY' &&
      copyBlocker(item) === ''
    ) {
      fallback = 'COPY'
    }
    if (fallback === null) {
      return { kind: 'failed', message: refusal }
    }
    const outcome =
      fallback === 'COPY'
        ? this.copy(item, parent)
        : this.shortcut(item, parent)
    return { ...outcome, message: `${refusal}; ${outcome.message}` }
  }

  private copy(item: Item, parent: DestParent): Outcome {
    if (this.dry) {
      return {
        kind: 'copied',
        message: 'would copy (revision history is not carried over)',
        destId: DRY_ID_PREFIX + item.id,
      }
    }
    const copied = this.deps.drive.copyFile(item.id, {
      name: item.name,
      parentId: parent.id,
      description: provenance(item, this.deps.timestamp()),
      properties: { [SOURCE_ID_PROPERTY]: item.id },
      copyComments: this.deps.config.copyComments,
    })
    this.remember(parent.id, copied)
    return this.finishCopy(item, copied.id)
  }

  /** Carries comments onto an existing copy; safe to call again after a cut-off. */
  private finishCopy(item: Item, copyId: string): Outcome {
    if (!this.deps.config.copyComments) {
      return { kind: 'copied', message: 'copied', destId: copyId }
    }
    let note: string
    try {
      const comments = carryComments(
        this.deps.drive,
        item.id,
        copyId,
        NATIVE_COMMENT_MIMES.has(item.mimeType),
        () => this.deps.budget.expired()
      )
      if (!comments.complete) {
        return {
          kind: 'partial',
          message: 'copied; comments are still being carried over',
          destId: copyId,
        }
      }
      note = describeComments(comments)
    } catch (error) {
      if (!(error instanceof DriveError)) {
        throw error
      }
      note = `comments not carried over: ${errorMessage(error)}`
    }
    return { kind: 'copied', message: `copied; ${note}`, destId: copyId }
  }

  private shortcut(item: Item, parent: DestParent): Outcome {
    const targetId = this.shortcutTarget(item)
    if (targetId === '') {
      return { kind: 'skipped', message: 'the shortcut has no known target' }
    }
    if (this.dry) {
      return {
        kind: 'shortcut',
        message: isShortcut(item)
          ? 'would recreate shortcut'
          : 'would create a shortcut to the original',
        destId: DRY_ID_PREFIX + item.id,
      }
    }
    const created = this.deps.drive.createShortcut(
      item.name,
      parent.id,
      targetId,
      item.id
    )
    this.remember(parent.id, created)
    return {
      kind: 'shortcut',
      message: isShortcut(item)
        ? 'shortcut recreated'
        : 'shortcut to the original created',
      destId: created.id,
    }
  }

  /**
   * What a shortcut should point at. A shortcut to something this migration
   * copied or recreated (a copied file, a folder) is pointed at the new item,
   * not at the original left behind in the source.
   */
  private shortcutTarget(item: Item): string {
    if (!isShortcut(item)) {
      return item.id
    }
    const target = this.byId.get(item.shortcutTargetId)
    if (
      this.dry ||
      target?.status !== 'DONE' ||
      target.destId === '' ||
      target.destId === target.id
    ) {
      return item.shortcutTargetId
    }
    // Unless what took its place is itself only a shortcut to the original.
    const replacement = this.deps.drive.getFile(target.destId)
    return replacement.mimeType === SHORTCUT_MIME
      ? item.shortcutTargetId
      : target.destId
  }

  private say(done: string, would: string): string {
    return this.dry ? would : done
  }
}

export function apply(
  deps: ApplyDeps,
  mode: Mode,
  items: readonly Item[]
): ApplyResult {
  return new Applier(deps, mode, items).run()
}
