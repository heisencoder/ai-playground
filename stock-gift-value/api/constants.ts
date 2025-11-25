/**
 * Constants for API handlers
 */

// Time conversion constants
export const SECONDS_PER_DAY = 86400

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const

// Default server configuration
export const DEFAULT_PORT = 3001
