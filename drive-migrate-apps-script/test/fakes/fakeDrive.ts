/**
 * An in-memory emulation of the Google Drive REST API v3, just deep enough to
 * be honest about the behaviour this tool depends on:
 *
 *   - a move keeps the file's ID, revisions and comments; a copy gets a new ID,
 *     one revision, and only (optionally) the open comments of Docs files
 *   - folders cannot be moved from My Drive into a shared drive
 *   - only the owner may move a file, unless the "editors may move" switch is on
 *   - listings are paginated
 *
 * It speaks HTTP-shaped requests and responses, so the real `DriveClient` (URL
 * building, error parsing, retries, the allow-list) is exercised unchanged.
 */

import type { DriveComment, DriveFile, DriveReply } from '../../src/core/model'
import { FOLDER_MIME, SHORTCUT_MIME } from '../../src/core/model'
import type { HttpRequest, HttpResponse } from '../../src/drive/client'

export const DOC_MIME = 'application/vnd.google-apps.document'
export const SHEET_MIME = 'application/vnd.google-apps.spreadsheet'
export const MAP_MIME = 'application/vnd.google-apps.map'
export const PDF_MIME = 'application/pdf'
const NATIVE_COMMENT_COPY_MIMES = new Set([
  DOC_MIME,
  SHEET_MIME,
  'application/vnd.google-apps.presentation',
])

export const ME = { emailAddress: 'me@example.com', displayName: 'Me' }
export const MY_DRIVE_ROOT = 'my-drive-root-0001'

export interface FakeFile {
  id: string
  name: string
  mimeType: string
  parents: string[]
  /** Set for items inside a shared drive. */
  driveId: string
  /** Empty for items in a shared drive, which have no individual owner. */
  ownerEmail: string
  ownerName: string
  size: number | null
  createdTime: string
  modifiedTime: string
  trashed: boolean
  description: string
  properties: Record<string, string>
  shortcutTargetId: string
  /** False when the owner has disabled copying for non-owners. */
  copyable: boolean
  revisions: number
  comments: DriveComment[]
}

export interface FileOptions {
  owner?: { emailAddress: string; displayName: string }
  size?: number
  copyable?: boolean
  revisions?: number
  createdTime?: string
  modifiedTime?: string
}

export interface CommentOptions {
  author?: string
  resolved?: boolean
  quoted?: string
  replies?: { content: string; author?: string }[]
  createdTime?: string
}

interface SharedDriveRecord {
  id: string
  name: string
  canAddChildren: boolean
}

interface InjectedFailure {
  method: string
  path: RegExp
  status: number
  reason: string
  remaining: number
}

/** Thrown to simulate Apps Script killing the execution mid-flight. */
export class ExecutionKilled extends Error {
  constructor() {
    super('Exceeded maximum execution time')
    this.name = 'ExecutionKilled'
  }
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function json(status: number, body: unknown): HttpResponse {
  return { status, body: JSON.stringify(body) }
}

function failure(
  status: number,
  reason: string,
  message: string
): HttpResponse {
  return json(status, {
    error: { code: status, message, errors: [{ reason, message }] },
  })
}

const NOT_FOUND = 404
const FORBIDDEN = 403
const BAD_REQUEST = 400
const OK = 200

export class FakeDrive {
  readonly files = new Map<string, FakeFile>()
  readonly drives = new Map<string, SharedDriveRecord>()
  /** Every request received, in order. */
  readonly requests: HttpRequest[] = []
  /** Workspace admin setting: may editors move files they do not own? */
  editorsMayMove = false
  /** Largest page a listing returns, to force the client to paginate. */
  maxPageSize = 100
  /** Called before each request; tests use it to advance a fake clock. */
  onRequest: (request: HttpRequest) => void = () => undefined
  /** After this many more successful writes, the "execution" is killed. */
  killAfterWrites: number | null = null

  private nextId = 1
  private readonly failures: InjectedFailure[] = []
  private readonly moveRefusals = new Map<string, string>()

  constructor() {
    this.files.set(
      MY_DRIVE_ROOT,
      this.blank(MY_DRIVE_ROOT, 'My Drive', FOLDER_MIME)
    )
  }

  // -- building a scenario ---------------------------------------------------

  addSharedDrive(name: string, canAddChildren = true): string {
    const id = this.newId('drive')
    this.drives.set(id, { id, name, canAddChildren })
    this.files.set(id, {
      ...this.blank(id, name, FOLDER_MIME),
      driveId: id,
      ownerEmail: '',
      ownerName: '',
    })
    return id
  }

  addFolder(name: string, parentId: string, options: FileOptions = {}): string {
    return this.add(name, FOLDER_MIME, parentId, options)
  }

  addFile(
    name: string,
    parentId: string,
    mimeType: string = DOC_MIME,
    options: FileOptions = {}
  ): string {
    return this.add(name, mimeType, parentId, options)
  }

  addShortcut(name: string, parentId: string, targetId: string): string {
    const id = this.add(name, SHORTCUT_MIME, parentId, {})
    this.file(id).shortcutTargetId = targetId
    return id
  }

  addComment(
    fileId: string,
    content: string,
    options: CommentOptions = {}
  ): string {
    const id = this.newId('comment')
    const comment: DriveComment = {
      id,
      content,
      author: { displayName: options.author ?? 'Alice Author' },
      createdTime: options.createdTime ?? '2024-03-01T10:00:00.000Z',
      resolved: options.resolved ?? false,
      deleted: false,
      replies: (options.replies ?? []).map((reply) => ({
        id: this.newId('reply'),
        content: reply.content,
        author: { displayName: reply.author ?? 'Bob Replier' },
        createdTime: '2024-03-02T11:00:00.000Z',
        deleted: false,
      })),
    }
    if (options.quoted !== undefined) {
      comment.quotedFileContent = { value: options.quoted }
    }
    this.file(fileId).comments.push(comment)
    return id
  }

  /** The next matching requests fail with this status and reason. */
  failNext(
    method: string,
    path: RegExp,
    status: number,
    reason: string,
    times = 1
  ): void {
    this.failures.push({ method, path, status, reason, remaining: times })
  }

  /** Drive will refuse to move this file (as it may for external accounts). */
  refuseMove(fileId: string, reason = 'insufficientFilePermissions'): void {
    this.moveRefusals.set(fileId, reason)
  }

  // -- inspecting the outcome ------------------------------------------------

  file(id: string): FakeFile {
    const found = this.files.get(id)
    if (found === undefined) {
      throw new Error(`no such fake file: ${id}`)
    }
    return found
  }

  childrenOf(parentId: string): FakeFile[] {
    return [...this.files.values()].filter(
      (file) => file.parents.includes(parentId) && !file.trashed
    )
  }

  /** Sorted `/`-joined paths of everything beneath a folder. */
  tree(rootId: string, prefix = ''): string[] {
    const paths: string[] = []
    for (const child of this.childrenOf(rootId)) {
      const path = `${prefix}${child.name}`
      paths.push(child.mimeType === FOLDER_MIME ? `${path}/` : path)
      if (child.mimeType === FOLDER_MIME) {
        paths.push(...this.tree(child.id, `${path}/`))
      }
    }
    return paths.sort()
  }

  find(parentId: string, name: string): FakeFile {
    const found = this.childrenOf(parentId).find((file) => file.name === name)
    if (found === undefined) {
      throw new Error(`"${name}" not found in ${parentId}`)
    }
    return found
  }

  writes(): HttpRequest[] {
    return this.requests.filter((request) => request.method !== 'GET')
  }

  // -- the HTTP surface ------------------------------------------------------

  readonly handle = (request: HttpRequest): HttpResponse => {
    this.onRequest(request)
    this.requests.push(request)
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/drive\/v3/, '')
    const injected = this.failures.find(
      (candidate) =>
        candidate.remaining > 0 &&
        candidate.method === request.method &&
        candidate.path.test(path)
    )
    if (injected !== undefined) {
      injected.remaining -= 1
      return failure(
        injected.status,
        injected.reason,
        `injected ${injected.reason}`
      )
    }
    const body =
      request.body === undefined
        ? {}
        : (JSON.parse(request.body) as Record<string, unknown>)
    const response = this.route(request.method, path, url.searchParams, body)
    if (
      request.method !== 'GET' &&
      response.status === OK &&
      this.killAfterWrites !== null
    ) {
      this.killAfterWrites -= 1
      if (this.killAfterWrites <= 0) {
        this.killAfterWrites = null
        throw new ExecutionKilled()
      }
    }
    return response
  }

  private route(
    method: string,
    path: string,
    query: URLSearchParams,
    body: Record<string, unknown>
  ): HttpResponse {
    const segments = path.split('/').filter((segment) => segment !== '')
    const [resource, id, sub, subId, leaf] = segments
    if (method === 'GET' && path === '/about') {
      return json(OK, { user: ME })
    }
    if (method === 'GET' && resource === 'drives' && id !== undefined) {
      return this.getDrive(id)
    }
    if (resource !== 'files') {
      return failure(NOT_FOUND, 'notFound', `No route for ${method} ${path}`)
    }
    if (id === undefined) {
      return method === 'GET' ? this.list(query) : this.create(body)
    }
    const file = this.files.get(id)
    if (file === undefined || file.trashed) {
      return failure(NOT_FOUND, 'notFound', `File not found: ${id}.`)
    }
    if (sub === undefined) {
      return method === 'GET'
        ? json(OK, this.render(file))
        : this.update(file, query, body)
    }
    return (
      this.routeFileChild(method, file, [sub, subId, leaf], query, body) ??
      failure(NOT_FOUND, 'notFound', `No route for ${method} ${path}`)
    )
  }

  private routeFileChild(
    method: string,
    file: FakeFile,
    [sub, subId, leaf]: (string | undefined)[],
    query: URLSearchParams,
    body: Record<string, unknown>
  ): HttpResponse | null {
    if (sub === 'copy' && method === 'POST') {
      return this.copy(file, query, body)
    }
    if (sub !== 'comments') {
      return null
    }
    if (subId === undefined) {
      return method === 'GET'
        ? this.listComments(file, query)
        : this.createComment(file, body)
    }
    return leaf === 'replies' && method === 'POST'
      ? this.createReply(file, subId, body)
      : null
  }

  private getDrive(id: string): HttpResponse {
    const drive = this.drives.get(id)
    return drive === undefined
      ? failure(NOT_FOUND, 'notFound', `Shared drive not found: ${id}`)
      : json(OK, {
          id: drive.id,
          name: drive.name,
          capabilities: { canAddChildren: drive.canAddChildren },
        })
  }

  private list(query: URLSearchParams): HttpResponse {
    const q = query.get('q') ?? ''
    const match = /^'((?:[^'\\]|\\.)+)' in parents and trashed = false$/.exec(q)
    if (match?.[1] === undefined) {
      return failure(BAD_REQUEST, 'invalid', `Unsupported query: ${q}`)
    }
    const driveId = query.get('driveId')
    if (driveId !== null && query.get('corpora') !== 'drive') {
      return failure(BAD_REQUEST, 'invalid', 'driveId requires corpora=drive')
    }
    const parentId = match[1].replace(/\\(.)/g, '$1')
    const parent = this.files.get(parentId)
    const inScope =
      parent !== undefined && (driveId === null || parent.driveId === driveId)
    if (
      parent !== undefined &&
      parent.driveId !== '' &&
      query.get('includeItemsFromAllDrives') !== 'true'
    ) {
      return json(OK, { files: [] })
    }
    const all = inScope ? this.childrenOf(parentId) : []
    const requested = Number(query.get('pageSize') ?? this.maxPageSize)
    const pageSize = Math.min(requested, this.maxPageSize)
    const offset = Number(query.get('pageToken') ?? '0')
    const page = all.slice(offset, offset + pageSize)
    const next = offset + pageSize
    return json(OK, {
      files: page.map((file) => this.render(file)),
      ...(next < all.length ? { nextPageToken: String(next) } : {}),
    })
  }

  private create(body: Record<string, unknown>): HttpResponse {
    const parents = (body.parents ?? []) as string[]
    const parentId = parents[0]
    const parent = parentId === undefined ? undefined : this.files.get(parentId)
    if (parentId === undefined || parent === undefined) {
      return failure(NOT_FOUND, 'notFound', 'Parent folder not found.')
    }
    const refusal = this.refuseAdd(parent)
    if (refusal !== null) {
      return refusal
    }
    const mimeType = text(body.mimeType, '')
    const id = this.add(text(body.name, 'Untitled'), mimeType, parentId, {})
    const created = this.file(id)
    created.properties = {
      ...((body.properties ?? {}) as Record<string, string>),
    }
    if (mimeType === SHORTCUT_MIME) {
      const details = (body.shortcutDetails ?? {}) as { targetId?: string }
      created.shortcutTargetId = details.targetId ?? ''
    }
    return json(OK, this.render(created))
  }

  private refuseAdd(parent: FakeFile): HttpResponse | null {
    const drive = this.drives.get(parent.driveId)
    return drive !== undefined && !drive.canAddChildren
      ? failure(
          FORBIDDEN,
          'insufficientFilePermissions',
          'The user does not have sufficient permissions for this file.'
        )
      : null
  }

  private update(
    file: FakeFile,
    query: URLSearchParams,
    body: Record<string, unknown>
  ): HttpResponse {
    if (Object.keys(body).length > 0) {
      return failure(BAD_REQUEST, 'invalid', 'The fake only supports moves.')
    }
    const target = this.files.get(query.get('addParents') ?? '')
    if (target === undefined) {
      return failure(NOT_FOUND, 'notFound', 'Destination folder not found.')
    }
    if (query.get('supportsAllDrives') !== 'true' && target.driveId !== '') {
      return failure(NOT_FOUND, 'notFound', `File not found: ${target.id}.`)
    }
    const refusal = this.refuseMoveOf(file, target) ?? this.refuseAdd(target)
    if (refusal !== null) {
      return refusal
    }
    file.parents = [target.id]
    file.driveId = target.driveId
    if (target.driveId !== '') {
      file.ownerEmail = ''
      file.ownerName = ''
    }
    return json(OK, this.render(file))
  }

  private refuseMoveOf(file: FakeFile, target: FakeFile): HttpResponse | null {
    const intoSharedDrive = file.driveId === '' && target.driveId !== ''
    if (file.mimeType === FOLDER_MIME && intoSharedDrive) {
      return failure(
        FORBIDDEN,
        'teamDrivesFolderMoveInNotSupported',
        'Moving folders into shared drives is not supported.'
      )
    }
    const scripted = this.moveRefusals.get(file.id)
    if (scripted !== undefined) {
      return failure(FORBIDDEN, scripted, 'The move was refused.')
    }
    const mine = file.ownerEmail === ME.emailAddress
    if (intoSharedDrive && !mine && !this.editorsMayMove) {
      return failure(
        FORBIDDEN,
        'fileWriterTeamDriveMoveInDisabled',
        'The domain administrator has not allowed writers to move items into a shared drive.'
      )
    }
    return null
  }

  private copy(
    source: FakeFile,
    query: URLSearchParams,
    body: Record<string, unknown>
  ): HttpResponse {
    const mine = source.ownerEmail === ME.emailAddress
    if (
      source.mimeType === FOLDER_MIME ||
      source.mimeType === MAP_MIME ||
      (!source.copyable && !mine)
    ) {
      return failure(
        FORBIDDEN,
        'cannotCopyFile',
        'This file cannot be copied by the user.'
      )
    }
    const parents = (body.parents ?? source.parents) as string[]
    const parentId = parents[0] ?? MY_DRIVE_ROOT
    const parent = this.files.get(parentId)
    if (parent === undefined) {
      return failure(NOT_FOUND, 'notFound', 'Parent folder not found.')
    }
    const refusal = this.refuseAdd(parent)
    if (refusal !== null) {
      return refusal
    }
    const id = this.add(
      text(body.name, `Copy of ${source.name}`),
      source.mimeType,
      parentId,
      source.size === null ? {} : { size: source.size }
    )
    const copy = this.file(id)
    copy.description = text(body.description, '')
    copy.properties = { ...((body.properties ?? {}) as Record<string, string>) }
    copy.shortcutTargetId = source.shortcutTargetId
    if (
      query.get('copyComments') === 'true' &&
      NATIVE_COMMENT_COPY_MIMES.has(source.mimeType)
    ) {
      copy.comments = source.comments
        .filter(
          (comment) => comment.resolved !== true && comment.deleted !== true
        )
        .map((comment) => ({ ...comment, id: this.newId('comment') }))
    }
    return json(OK, this.render(copy))
  }

  private listComments(file: FakeFile, query: URLSearchParams): HttpResponse {
    if (query.get('fields') === null) {
      return failure(
        BAD_REQUEST,
        'required',
        'The fields parameter is required.'
      )
    }
    const pageSize = Math.min(
      Number(query.get('pageSize') ?? '20'),
      this.maxPageSize
    )
    const offset = Number(query.get('pageToken') ?? '0')
    const next = offset + pageSize
    return json(OK, {
      comments: file.comments.slice(offset, next),
      ...(next < file.comments.length ? { nextPageToken: String(next) } : {}),
    })
  }

  private createComment(
    file: FakeFile,
    body: Record<string, unknown>
  ): HttpResponse {
    const comment: DriveComment = {
      id: this.newId('comment'),
      content: text(body.content, ''),
      author: { displayName: ME.displayName, emailAddress: ME.emailAddress },
      createdTime: '2026-01-01T00:00:00.000Z',
      resolved: false,
      deleted: false,
      replies: [],
    }
    file.comments.push(comment)
    return json(OK, { id: comment.id })
  }

  private createReply(
    file: FakeFile,
    commentId: string,
    body: Record<string, unknown>
  ): HttpResponse {
    const comment = file.comments.find(
      (candidate) => candidate.id === commentId
    )
    if (comment === undefined) {
      return failure(NOT_FOUND, 'notFound', `Comment not found: ${commentId}`)
    }
    const reply: DriveReply = {
      id: this.newId('reply'),
      content: text(body.content, ''),
      author: { displayName: ME.displayName },
      createdTime: '2026-01-01T00:00:00.000Z',
      deleted: false,
    }
    if (body.action === 'resolve') {
      reply.action = 'resolve'
      comment.resolved = true
    }
    comment.replies = [...(comment.replies ?? []), reply]
    return json(OK, { id: reply.id })
  }

  // -- internals -------------------------------------------------------------

  private newId(kind: string): string {
    const id = `${kind}-${String(this.nextId).padStart(8, '0')}`
    this.nextId += 1
    return id
  }

  private blank(id: string, name: string, mimeType: string): FakeFile {
    return {
      id,
      name,
      mimeType,
      parents: [],
      driveId: '',
      ownerEmail: ME.emailAddress,
      ownerName: ME.displayName,
      size: null,
      createdTime: '2023-01-15T09:00:00.000Z',
      modifiedTime: '2024-06-20T16:30:00.000Z',
      trashed: false,
      description: '',
      properties: {},
      shortcutTargetId: '',
      copyable: true,
      revisions: 1,
      comments: [],
    }
  }

  private add(
    name: string,
    mimeType: string,
    parentId: string,
    options: FileOptions
  ): string {
    const parent = this.file(parentId)
    const id = this.newId(mimeType === FOLDER_MIME ? 'folder' : 'file')
    const inSharedDrive = parent.driveId !== ''
    const owner = inSharedDrive
      ? { emailAddress: '', displayName: '' }
      : (options.owner ?? ME)
    this.files.set(id, {
      ...this.blank(id, name, mimeType),
      parents: [parentId],
      driveId: parent.driveId,
      ownerEmail: owner.emailAddress,
      ownerName: owner.displayName,
      size: options.size ?? null,
      copyable: options.copyable ?? true,
      revisions: options.revisions ?? 1,
      createdTime: options.createdTime ?? '2023-01-15T09:00:00.000Z',
      modifiedTime: options.modifiedTime ?? '2024-06-20T16:30:00.000Z',
    })
    return id
  }

  private render(file: FakeFile): DriveFile {
    const mine = file.ownerEmail === ME.emailAddress
    const inSharedDrive = file.driveId !== ''
    const rendered: DriveFile = {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      parents: [...file.parents],
      ownedByMe: mine && !inSharedDrive,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      trashed: file.trashed,
      webViewLink: `https://drive.google.com/file/d/${file.id}/view`,
      properties: { ...file.properties },
      capabilities: {
        canCopy: file.mimeType !== FOLDER_MIME && (file.copyable || mine),
        canMoveItemOutOfDrive: mine && !inSharedDrive,
        canAddChildren:
          file.mimeType === FOLDER_MIME &&
          (this.drives.get(file.driveId)?.canAddChildren ?? true),
      },
    }
    if (inSharedDrive) {
      rendered.driveId = file.driveId
    } else {
      rendered.owners = [
        { emailAddress: file.ownerEmail, displayName: file.ownerName },
      ]
    }
    if (file.size !== null) {
      rendered.size = String(file.size)
    }
    if (file.description !== '') {
      rendered.description = file.description
    }
    if (file.mimeType === SHORTCUT_MIME) {
      rendered.shortcutDetails = { targetId: file.shortcutTargetId }
    }
    return rendered
  }
}
