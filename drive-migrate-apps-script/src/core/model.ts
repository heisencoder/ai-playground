/**
 * Domain model and ports.
 *
 * Nothing in `src/core` touches an Apps Script global. The Drive API is reached
 * through {@link DrivePort} and all persistent state through {@link Store}, so
 * the whole migration can run under Node against in-memory fakes.
 */

export const FOLDER_MIME = 'application/vnd.google-apps.folder'
export const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut'

/** Google file types the API refuses to copy, or copies without their data. */
export const UNCOPYABLE_MIMES: ReadonlySet<string> = new Set([
  'application/vnd.google-apps.map',
  'application/vnd.google-apps.site',
  'application/vnd.google-apps.fusiontable',
])

/** Key of the custom file property that links a destination item to its source. */
export const SOURCE_ID_PROPERTY = 'dmSourceId'

export const ACTIONS = [
  'CREATE_FOLDER',
  'MOVE',
  'COPY',
  'SHORTCUT',
  'SKIP',
] as const
export type Action = (typeof ACTIONS)[number]

/** Actions a person may type into the Override column of a file row. */
export const FILE_OVERRIDES: readonly Action[] = [
  'MOVE',
  'COPY',
  'SHORTCUT',
  'SKIP',
]

export const STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'DONE',
  'SKIPPED',
  'FAILED',
  'BLOCKED',
] as const
export type Status = (typeof STATUSES)[number]

/** Folders only. ERROR: Drive would not list it, so its contents are unknown. */
export type ScanState = '' | 'PENDING' | 'DONE' | 'ERROR'

/** One row of the Items sheet: a file or folder found under the source folder. */
export interface Item {
  /** 1-based sheet row; assigned by the store. */
  row: number
  id: string
  /** Path from (and including) the source folder, `/`-separated. */
  path: string
  name: string
  mimeType: string
  /** Source parent folder ID; empty for the source folder itself. */
  parentId: string
  depth: number
  ownerEmail: string
  ownerName: string
  ownedByMe: boolean
  size: number | null
  createdTime: string
  modifiedTime: string
  canCopy: boolean
  canMoveOut: boolean
  shortcutTargetId: string
  webViewLink: string
  /** Folders only: whether their children have been listed yet. */
  scanState: ScanState
  action: Action | ''
  reason: string
  /** Typed by the person running the migration; wins over `action`. */
  override: Action | ''
  status: Status | ''
  destId: string
  /** `true` when the destination folder already existed and was merged into. */
  destPreExisting: boolean
  result: string
  dryRun: string
  dryDestId: string
  dryPreExisting: boolean
  updatedAt: string
}

/** Fields the scanner supplies; the store fills in `row`. */
export type NewItem = Omit<Item, 'row'>

export type OthersFilesPolicy = 'COPY' | 'SHORTCUT' | 'SKIP'
export type MoveRefusedPolicy = 'FAIL' | 'COPY'

export interface Config {
  sourceId: string
  destinationId: string
  createRootFolder: boolean
  pathFilter: string
  othersFiles: OthersFilesPolicy
  tryMoveOthersFiles: boolean
  moveRefused: MoveRefusedPolicy
  copyComments: boolean
  allowDuplicateNames: boolean
  autoContinue: boolean
  minutesPerRun: number
}

/** Raw file resource as returned by Drive API v3 (only the fields we request). */
export interface DriveFile {
  id: string
  name?: string
  mimeType?: string
  parents?: string[]
  driveId?: string
  ownedByMe?: boolean
  owners?: { emailAddress?: string; displayName?: string }[]
  size?: string
  createdTime?: string
  modifiedTime?: string
  trashed?: boolean
  webViewLink?: string
  description?: string
  properties?: Record<string, string>
  shortcutDetails?: { targetId?: string; targetMimeType?: string }
  capabilities?: {
    canCopy?: boolean
    canMoveItemOutOfDrive?: boolean
    canAddChildren?: boolean
  }
}

export interface DriveUser {
  displayName?: string
  emailAddress?: string
}

export interface DriveReply {
  id?: string
  content?: string
  author?: DriveUser
  createdTime?: string
  action?: string
  deleted?: boolean
}

export interface DriveComment {
  id?: string
  content?: string
  author?: DriveUser
  createdTime?: string
  resolved?: boolean
  deleted?: boolean
  quotedFileContent?: { value?: string }
  replies?: DriveReply[]
}

export interface SharedDrive {
  id: string
  name?: string
  capabilities?: { canAddChildren?: boolean }
}

export interface CopyRequest {
  name: string
  parentId: string
  description: string
  properties: Record<string, string>
  copyComments: boolean
}

/** The Drive operations the migration needs. Implemented by `DriveClient`. */
export interface DrivePort {
  about(): DriveUser
  getFile(fileId: string): DriveFile
  /** Returns `null` when `driveId` is not a shared drive visible to the user. */
  getSharedDrive(driveId: string): SharedDrive | null
  /** `driveId` scopes the listing to one shared drive; omit it for My Drive. */
  listChildren(folderId: string, driveId?: string): DriveFile[]
  createFolder(name: string, parentId: string, sourceId: string): DriveFile
  createShortcut(
    name: string,
    parentId: string,
    targetId: string,
    sourceId: string
  ): DriveFile
  /** `removeParents` must name every current parent: shared drive items have one. */
  moveFile(
    fileId: string,
    addParent: string,
    removeParents: readonly string[]
  ): DriveFile
  copyFile(fileId: string, request: CopyRequest): DriveFile
  listComments(fileId: string): DriveComment[]
  createComment(fileId: string, content: string): DriveComment
  createReply(
    fileId: string,
    commentId: string,
    content: string,
    resolve: boolean
  ): DriveReply
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR'

/** Small persistent key/value entries (job state, resolved IDs). */
export type MetaKey =
  | 'job'
  | 'stop'
  | 'scan'
  | 'sourceName'
  | 'destRootId'
  | 'destDriveId'
  | 'user'
  | 'strikes'

/** Persistent state. Implemented over a Google Sheet by `SheetStore`. */
export interface Store {
  readConfigValues(): Record<string, string>
  readItems(): Item[]
  appendItems(items: NewItem[]): Item[]
  /** Persist every mutable column of the given rows. */
  writeItems(items: readonly Item[]): void
  /**
   * Empties the inventory for a new scan. Override values are remembered by
   * file ID and given back to matching rows as `appendItems` adds them.
   */
  clearItems(): void
  getMeta(key: MetaKey): string
  setMeta(key: MetaKey, value: string): void
  log(level: LogLevel, message: string): void
  writeSummary(rows: string[][]): void
  /** Push buffered writes to durable storage. */
  flush(): void
}

/** Wall clock and run-time budget for one Apps Script execution. */
export interface Clock {
  now(): number
}

export function isFolder(item: { mimeType: string }): boolean {
  return item.mimeType === FOLDER_MIME
}

export function isShortcut(item: { mimeType: string }): boolean {
  return item.mimeType === SHORTCUT_MIME
}

export function effectiveAction(item: Item): Action | '' {
  return item.override === '' ? item.action : item.override
}
