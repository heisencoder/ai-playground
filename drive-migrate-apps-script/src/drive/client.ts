/**
 * Drive REST API v3 client.
 *
 * Talks plain HTTP through an injected {@link Transport}, so the same code runs
 * on `UrlFetchApp` in Apps Script and against the in-memory fake Drive in tests.
 * Three safety properties live here:
 *
 *   - an allow-list: only the handful of request shapes the migration needs can
 *     be sent at all. Nothing deletes, trashes or changes sharing.
 *   - a read-only mode, used by the scan and the dry run, in which any request
 *     that would change Drive is refused before it is sent.
 *   - retries with exponential backoff, but never of a write whose outcome is
 *     unknown (see {@link isRetryable}).
 *
 * Apps Script's V8 runtime has no `URL`, `URLSearchParams` or `fetch`; this
 * file sticks to string handling for that reason.
 */

import { DisallowedOperationError, DriveError } from '../core/errors'
import type {
  CopyRequest,
  DriveComment,
  DriveFile,
  DrivePort,
  DriveReply,
  DriveUser,
  SharedDrive,
} from '../core/model'
import { FOLDER_MIME, SHORTCUT_MIME, SOURCE_ID_PROPERTY } from '../core/model'

export type HttpMethod = 'GET' | 'POST' | 'PATCH'

export interface HttpRequest {
  method: HttpMethod
  url: string
  /** JSON text; present on POST and PATCH. */
  body?: string
}

export interface HttpResponse {
  status: number
  body: string
}

export type Transport = (request: HttpRequest) => HttpResponse

export interface ClientOptions {
  transport: Transport
  sleep: (milliseconds: number) => void
  readOnly: boolean
  /** Source of jitter for backoff; injectable so tests are deterministic. */
  random?: () => number
}

export const DRIVE_BASE_URL = 'https://www.googleapis.com/drive/v3'

const FILE_FIELDS =
  'id,name,mimeType,parents,driveId,ownedByMe,owners(emailAddress,displayName),' +
  'size,createdTime,modifiedTime,trashed,webViewLink,properties,' +
  'shortcutDetails(targetId,targetMimeType),' +
  'capabilities(canCopy,canMoveItemOutOfDrive,canAddChildren)'

const COMMENT_FIELDS =
  'nextPageToken,comments(id,content,author(displayName,emailAddress),' +
  'createdTime,resolved,deleted,quotedFileContent(value),' +
  'replies(id,content,author(displayName,emailAddress),createdTime,action,deleted))'

const PAGE_SIZE = 200
const COMMENT_PAGE_SIZE = 100
const MAX_ATTEMPTS = 6
const BASE_DELAY_MS = 1000
const HTTP_OK_MIN = 200
const HTTP_OK_MAX = 299
const HTTP_FORBIDDEN = 403
const HTTP_NOT_FOUND = 404
const HTTP_TOO_MANY_REQUESTS = 429
const HTTP_SERVER_ERROR = 500
/** Status a transport reports when the request got no HTTP response at all. */
export const NO_RESPONSE = 0
const RETRYABLE_403_REASONS: ReadonlySet<string> = new Set([
  'rateLimitExceeded',
  'userRateLimitExceeded',
  'sharingRateLimitExceeded',
])

interface AllowedRequest {
  method: HttpMethod
  path: RegExp
  write: boolean
}

const ID = '[A-Za-z0-9_-]+'

/**
 * Every request shape this tool may send. Checked against the real method and
 * URL immediately before sending, so a coding mistake elsewhere cannot reach an
 * operation the tool is not meant to perform.
 */
export const ALLOWED_REQUESTS: readonly AllowedRequest[] = [
  { method: 'GET', path: /^\/about$/, write: false },
  { method: 'GET', path: /^\/files$/, write: false },
  { method: 'GET', path: new RegExp(`^/files/${ID}$`), write: false },
  { method: 'GET', path: new RegExp(`^/drives/${ID}$`), write: false },
  { method: 'GET', path: new RegExp(`^/files/${ID}/comments$`), write: false },
  { method: 'POST', path: /^\/files$/, write: true },
  { method: 'POST', path: new RegExp(`^/files/${ID}/copy$`), write: true },
  { method: 'PATCH', path: new RegExp(`^/files/${ID}$`), write: true },
  { method: 'POST', path: new RegExp(`^/files/${ID}/comments$`), write: true },
  {
    method: 'POST',
    path: new RegExp(`^/files/${ID}/comments/${ID}/replies$`),
    write: true,
  },
]

/** Request-body fields that would trash a file or alter who can see it. */
const FORBIDDEN_BODY_FIELDS = ['trashed', 'permissions', 'permissionIds']

type QueryValue = string | number | boolean

interface ErrorBody {
  error?: {
    message?: string
    errors?: { reason?: string }[]
  }
}

function buildUrl(path: string, query: Record<string, QueryValue>): string {
  const pairs = Object.keys(query).map(
    (key) =>
      `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`
  )
  return `${DRIVE_BASE_URL}${path}${pairs.length === 0 ? '' : `?${pairs.join('&')}`}`
}

function pathOf(url: string): string {
  if (!url.startsWith(DRIVE_BASE_URL)) {
    return ''
  }
  const rest = url.slice(DRIVE_BASE_URL.length)
  const queryStart = rest.indexOf('?')
  return queryStart === -1 ? rest : rest.slice(0, queryStart)
}

/** Throws unless the request is on the allow-list and permitted in this mode. */
export function assertAllowed(request: HttpRequest, readOnly: boolean): void {
  const path = pathOf(request.url)
  const rule = ALLOWED_REQUESTS.find(
    (candidate) =>
      candidate.method === request.method && candidate.path.test(path)
  )
  if (rule === undefined) {
    throw new DisallowedOperationError(
      `Blocked: ${request.method} ${request.url} is not an operation this tool performs.`
    )
  }
  if (rule.write && readOnly) {
    throw new DisallowedOperationError(
      `Blocked: ${request.method} ${path} would change Drive, but this is a read-only run.`
    )
  }
  if (request.body !== undefined) {
    const body = JSON.parse(request.body) as Record<string, unknown>
    const forbidden = FORBIDDEN_BODY_FIELDS.find((field) => field in body)
    if (forbidden !== undefined) {
      throw new DisallowedOperationError(
        `Blocked: a request tried to set "${forbidden}".`
      )
    }
  }
}

function parseError(response: HttpResponse): DriveError {
  let message = `HTTP ${String(response.status)}`
  let reason = ''
  try {
    const parsed = JSON.parse(response.body) as ErrorBody
    message = parsed.error?.message ?? message
    reason = parsed.error?.errors?.[0]?.reason ?? ''
  } catch {
    // Not JSON (a proxy error page, say); the status code is all we have.
  }
  return new DriveError(
    reason === '' ? message : `${message} [${reason}]`,
    response.status,
    reason
  )
}

/**
 * Whether sending the same request again is both worthwhile and safe.
 *
 * A rate limit means Drive turned the request away, so anything may be resent.
 * A server error or a dropped connection says nothing about whether the
 * request took effect, so only reads are resent: repeating a copy or a comment
 * that did in fact succeed would duplicate it. Those surface as a failure, and
 * the executor checks the destination before it tries again.
 */
function isRetryable(
  method: HttpMethod,
  status: number,
  reason: string
): boolean {
  if (status === HTTP_TOO_MANY_REQUESTS) {
    return true
  }
  if (status === HTTP_FORBIDDEN) {
    return RETRYABLE_403_REASONS.has(reason)
  }
  return (
    method === 'GET' && (status === NO_RESPONSE || status >= HTTP_SERVER_ERROR)
  )
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export class DriveClient implements DrivePort {
  private readonly random: () => number

  constructor(private readonly options: ClientOptions) {
    this.random = options.random ?? Math.random
  }

  about(): DriveUser {
    const result = this.call<{ user?: DriveUser }>('GET', '/about', {
      fields: 'user(displayName,emailAddress)',
    })
    return result.user ?? {}
  }

  getFile(fileId: string): DriveFile {
    return this.call<DriveFile>('GET', `/files/${fileId}`, {
      fields: FILE_FIELDS,
      supportsAllDrives: true,
    })
  }

  getSharedDrive(driveId: string): SharedDrive | null {
    try {
      return this.call<SharedDrive>('GET', `/drives/${driveId}`, {
        fields: 'id,name,capabilities(canAddChildren)',
      })
    } catch (error) {
      // Drive answers "not found" (or, for some IDs, "forbidden") when the ID
      // belongs to something other than a shared drive, such as a folder.
      if (
        error instanceof DriveError &&
        (error.status === HTTP_NOT_FOUND || error.status === HTTP_FORBIDDEN)
      ) {
        return null
      }
      throw error
    }
  }

  listChildren(folderId: string, driveId?: string): DriveFile[] {
    const query: Record<string, QueryValue> = {
      q: `'${escapeQueryValue(folderId)}' in parents and trashed = false`,
      fields: `nextPageToken,files(${FILE_FIELDS})`,
      pageSize: PAGE_SIZE,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    }
    if (driveId !== undefined && driveId !== '') {
      query.corpora = 'drive'
      query.driveId = driveId
    }
    const files: DriveFile[] = []
    let pageToken: string | undefined
    do {
      const page = this.call<{ files?: DriveFile[]; nextPageToken?: string }>(
        'GET',
        '/files',
        pageToken === undefined ? query : { ...query, pageToken }
      )
      files.push(...(page.files ?? []))
      pageToken = page.nextPageToken
    } while (pageToken !== undefined && pageToken !== '')
    return files
  }

  createFolder(name: string, parentId: string, sourceId: string): DriveFile {
    return this.call<DriveFile>(
      'POST',
      '/files',
      { fields: FILE_FIELDS, supportsAllDrives: true },
      {
        name,
        mimeType: FOLDER_MIME,
        parents: [parentId],
        properties: { [SOURCE_ID_PROPERTY]: sourceId },
      }
    )
  }

  createShortcut(
    name: string,
    parentId: string,
    targetId: string,
    sourceId: string
  ): DriveFile {
    return this.call<DriveFile>(
      'POST',
      '/files',
      { fields: FILE_FIELDS, supportsAllDrives: true },
      {
        name,
        mimeType: SHORTCUT_MIME,
        parents: [parentId],
        shortcutDetails: { targetId },
        properties: { [SOURCE_ID_PROPERTY]: sourceId },
      }
    )
  }

  moveFile(
    fileId: string,
    addParent: string,
    removeParents: readonly string[]
  ): DriveFile {
    return this.call<DriveFile>(
      'PATCH',
      `/files/${fileId}`,
      {
        addParents: addParent,
        removeParents: removeParents.join(','),
        fields: FILE_FIELDS,
        supportsAllDrives: true,
      },
      {}
    )
  }

  copyFile(fileId: string, request: CopyRequest): DriveFile {
    return this.call<DriveFile>(
      'POST',
      `/files/${fileId}/copy`,
      {
        fields: FILE_FIELDS,
        supportsAllDrives: true,
        copyComments: request.copyComments,
      },
      {
        name: request.name,
        parents: [request.parentId],
        description: request.description,
        properties: request.properties,
      }
    )
  }

  listComments(fileId: string): DriveComment[] {
    const query: Record<string, QueryValue> = {
      fields: COMMENT_FIELDS,
      pageSize: COMMENT_PAGE_SIZE,
      includeDeleted: false,
    }
    const comments: DriveComment[] = []
    let pageToken: string | undefined
    do {
      const page = this.call<{
        comments?: DriveComment[]
        nextPageToken?: string
      }>(
        'GET',
        `/files/${fileId}/comments`,
        pageToken === undefined ? query : { ...query, pageToken }
      )
      comments.push(...(page.comments ?? []))
      pageToken = page.nextPageToken
    } while (pageToken !== undefined && pageToken !== '')
    return comments
  }

  createComment(fileId: string, content: string): DriveComment {
    return this.call<DriveComment>(
      'POST',
      `/files/${fileId}/comments`,
      { fields: 'id' },
      { content }
    )
  }

  createReply(
    fileId: string,
    commentId: string,
    content: string,
    resolve: boolean
  ): DriveReply {
    return this.call<DriveReply>(
      'POST',
      `/files/${fileId}/comments/${commentId}/replies`,
      { fields: 'id' },
      resolve ? { content, action: 'resolve' } : { content }
    )
  }

  // The type parameter names the response shape each endpoint is documented to
  // return; JSON from the network cannot be checked any more strictly than that.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  private call<T>(
    method: HttpMethod,
    path: string,
    query: Record<string, QueryValue>,
    body?: Record<string, unknown>
  ): T {
    const request: HttpRequest = { method, url: buildUrl(path, query) }
    if (body !== undefined) {
      request.body = JSON.stringify(body)
    }
    assertAllowed(request, this.options.readOnly)

    for (let attempt = 1; ; attempt += 1) {
      const response = this.options.transport(request)
      if (response.status >= HTTP_OK_MIN && response.status <= HTTP_OK_MAX) {
        return (response.body === '' ? {} : JSON.parse(response.body)) as T
      }
      const error = parseError(response)
      if (
        !isRetryable(method, response.status, error.reason) ||
        attempt >= MAX_ATTEMPTS
      ) {
        throw error
      }
      const backoff = BASE_DELAY_MS * 2 ** (attempt - 1)
      this.options.sleep(backoff + Math.floor(this.random() * BASE_DELAY_MS))
    }
  }
}
