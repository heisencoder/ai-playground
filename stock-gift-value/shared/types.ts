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

/**
 * Stock price data structure returned by the API
 */
export interface StockPriceData {
  date: string
  high: number
  low: number
  ticker: string
}

/**
 * Request parameters for stock price endpoint
 */
export interface StockPriceRequest {
  ticker?: string | string[]
  date?: string | string[]
}

/**
 * Response structure from stock price endpoint
 */
export interface StockPriceResponse {
  status: number
  data?: StockPriceData
  error?: string
  details?: string
}
