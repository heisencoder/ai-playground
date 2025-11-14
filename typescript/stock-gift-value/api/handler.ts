/**
 * Shared stock price handler logic
 * Used by both Vercel serverless function and local dev server
 */

import { HTTP_STATUS } from './constants'
import {
  validateTicker,
  validateDate,
  extractTicker,
  extractDate,
  normalizeTickerForYahoo,
} from './validators'
import { fetchFromYahooFinance } from './yahooFinanceClient'

export interface StockPriceData {
  date: string
  high: number
  low: number
  ticker: string
}

export interface StockPriceRequest {
  ticker?: string | string[]
  date?: string | string[]
}

export interface StockPriceResponse {
  status: number
  data?: StockPriceData
  error?: string
  details?: string
}

// Re-export for backward compatibility
export { normalizeTickerForYahoo }

/**
 * Core handler logic for fetching stock prices
 * Platform-agnostic - works with any request/response adapter
 */
export async function handleStockPriceRequest(
  params: StockPriceRequest
): Promise<StockPriceResponse> {
  // Validate ticker
  const tickerValidation = validateTicker(params.ticker)
  if (!tickerValidation.isValid) {
    return {
      status: HTTP_STATUS.BAD_REQUEST,
      error: tickerValidation.error,
    }
  }

  // Validate date
  const dateValidation = validateDate(params.date)
  if (!dateValidation.isValid) {
    return {
      status: HTTP_STATUS.BAD_REQUEST,
      error: dateValidation.error,
    }
  }

  // Extract validated values
  const ticker = extractTicker(params.ticker)
  const date = extractDate(params.date)

  // Normalize ticker for Yahoo Finance (BRK.B → BRK-B)
  const normalizedTicker = normalizeTickerForYahoo(ticker.toUpperCase())

  // Fetch from Yahoo Finance
  const result = await fetchFromYahooFinance(normalizedTicker, ticker, date)
  return result
}
