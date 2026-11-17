/** A Drive API call failed for good (after any retries). */
export class DriveError extends Error {
  readonly status: number
  readonly reason: string

  constructor(message: string, status: number, reason: string) {
    super(message)
    this.name = 'DriveError'
    this.status = status
    this.reason = reason
  }
}

/**
 * A request was blocked before it was sent, either because the client is
 * read-only and the request would write, or because the operation is not on the
 * allow-list at all (nothing in this tool may delete or trash). Deliberately not
 * a {@link DriveError}: it is never recorded as a per-item failure, it aborts.
 */
export class DisallowedOperationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DisallowedOperationError'
  }
}

/** The Config sheet is missing something or holds a value that makes no sense. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
