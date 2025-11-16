/**
 * Shared type definitions used by both client and server
 */

/**
 * Payload structure for client-side errors sent to the server for logging
 */
export interface ClientErrorPayload {
  message: string
  stack?: string
  url: string
  lineNumber?: number
  columnNumber?: number
  timestamp: string
  userAgent: string
  type: 'error' | 'unhandledrejection'
  additionalContext?: Record<string, unknown>
}
