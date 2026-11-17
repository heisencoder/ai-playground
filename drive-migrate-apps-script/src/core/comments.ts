/**
 * Carry comment threads onto a copied file.
 *
 * `files.copy` with `copyComments=true` copies the *open* comments of Google
 * Docs, Sheets and Slides natively. Everything else (resolved threads, comments
 * on other file types, or all of them when the native copy did not happen) is
 * re-posted as text. Consequences of a re-post:
 *
 *   - It is authored by the account running the migration; the original author
 *     and date are written into the comment text.
 *   - The anchor (the highlighted range) cannot be reattached, because it
 *     refers to a revision of the source file. The quoted text is kept inline.
 *   - Resolved threads are resolved again.
 *
 * Re-posting is idempotent: whatever part of a thread is already on the
 * destination is not posted again, so an interrupted file can simply be redone.
 */

import { DriveError } from './errors'
import type { DriveComment, DrivePort, DriveReply } from './model'

export const COMMENT_BANNER = '[migrated comment]'
export const REPLY_BANNER = '[migrated reply]'
const DATE_LENGTH = 10
const MAX_QUOTE = 500
const MAX_CONTENT = 4000
const ELLIPSIS = '...'

export interface CommentOutcome {
  /** Threads on the source file. */
  total: number
  /** Threads Drive copied natively. */
  native: number
  /** Threads this tool re-posted as text (now or on an earlier attempt). */
  reposted: number
  errors: string[]
  /** False when the time budget ran out before every thread was handled. */
  complete: boolean
}

function clip(text: string, max: number): string {
  return text.length <= max
    ? text
    : text.slice(0, max - ELLIPSIS.length) + ELLIPSIS
}

function render(
  entry: DriveComment | DriveReply,
  banner: string,
  quoted = ''
): string {
  const author = entry.author?.displayName ?? 'Unknown author'
  const when = (entry.createdTime ?? '').slice(0, DATE_LENGTH)
  const lines = [`${banner} ${author}${when === '' ? '' : ` - ${when}`}`]
  if (quoted !== '') {
    lines.push(`> ${clip(quoted, MAX_QUOTE).replace(/\n/g, '\n> ')}`)
  }
  lines.push(entry.content ?? '')
  return clip(lines.join('\n').trim(), MAX_CONTENT)
}

export function renderComment(comment: DriveComment): string {
  return render(comment, COMMENT_BANNER, comment.quotedFileContent?.value)
}

export function renderReply(reply: DriveReply): string {
  return render(reply, REPLY_BANNER)
}

function isRepost(comment: DriveComment): boolean {
  return (comment.content ?? '').startsWith(COMMENT_BANNER)
}

function live(comments: DriveComment[]): DriveComment[] {
  return comments.filter((comment) => comment.deleted !== true)
}

/**
 * Brings one thread on the destination up to date: posts the comment unless it
 * is already there, then whichever replies are missing, then resolves it. That
 * makes a half-posted thread (the execution died part-way) safe to finish.
 */
function repostThread(
  drive: DrivePort,
  destId: string,
  thread: DriveComment,
  text: string,
  posted: DriveComment | undefined
): void {
  const commentId = posted?.id ?? drive.createComment(destId, text).id ?? ''
  const present = new Set((posted?.replies ?? []).map((reply) => reply.content))
  for (const reply of thread.replies ?? []) {
    const replyText = renderReply(reply)
    if (
      reply.deleted !== true &&
      (reply.content ?? '') !== '' &&
      !present.has(replyText)
    ) {
      drive.createReply(destId, commentId, replyText, false)
    }
  }
  if (thread.resolved === true && posted?.resolved !== true) {
    drive.createReply(
      destId,
      commentId,
      `${COMMENT_BANNER} thread was resolved on the original.`,
      true
    )
  }
}

/** Reads both files' threads; `null` when the file type has no comments. */
function readThreads(
  drive: DrivePort,
  sourceId: string,
  destId: string,
  outcome: CommentOutcome
): { threads: DriveComment[]; existing: DriveComment[] } | null {
  try {
    const threads = live(drive.listComments(sourceId))
    outcome.total = threads.length
    return {
      threads,
      existing: threads.length === 0 ? [] : live(drive.listComments(destId)),
    }
  } catch (error) {
    if (!(error instanceof DriveError)) {
      throw error
    }
    // Some file types do not support comments at all; that is not a failure.
    outcome.errors.push(`could not read comments: ${error.message}`)
    return null
  }
}

export function carryComments(
  drive: DrivePort,
  sourceId: string,
  destId: string,
  shouldStop: () => boolean
): CommentOutcome {
  const outcome: CommentOutcome = {
    total: 0,
    native: 0,
    reposted: 0,
    errors: [],
    complete: true,
  }
  const read = readThreads(drive, sourceId, destId, outcome)
  if (read === null || read.threads.length === 0) {
    return outcome
  }
  const { threads, existing } = read
  outcome.native = existing.filter((comment) => !isRepost(comment)).length
  const postedByText = new Map(
    existing.map((comment) => [comment.content ?? '', comment])
  )
  // When Drive copied the open threads itself, only resolved ones are left.
  const candidates =
    outcome.native > 0
      ? threads.filter((thread) => thread.resolved === true)
      : threads

  for (const thread of candidates) {
    if (shouldStop()) {
      outcome.complete = false
      break
    }
    const text = renderComment(thread)
    try {
      repostThread(drive, destId, thread, text, postedByText.get(text))
      outcome.reposted += 1
    } catch (error) {
      if (!(error instanceof DriveError)) {
        throw error
      }
      outcome.errors.push(`comment ${thread.id ?? '?'}: ${error.message}`)
    }
  }
  return outcome
}

export function describeComments(outcome: CommentOutcome): string {
  if (outcome.total === 0 && outcome.errors.length === 0) {
    return 'no comments'
  }
  const parts = [`${String(outcome.total)} comment thread(s)`]
  if (outcome.native > 0) {
    parts.push(`${String(outcome.native)} copied natively`)
  }
  if (outcome.reposted > 0) {
    parts.push(`${String(outcome.reposted)} re-posted as text`)
  }
  if (outcome.errors.length > 0) {
    parts.push(
      `${String(outcome.errors.length)} problem(s): ${outcome.errors[0] ?? ''}`
    )
  }
  return parts.join(', ')
}
