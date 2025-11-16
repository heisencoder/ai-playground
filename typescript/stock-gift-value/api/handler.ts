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
} from './validators'
import { fetchFromYahooFinance } from './yahooFinanceClient'
import type { StockPriceRequest, StockPriceResponse } from '../shared/types.js'

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
  const ticker = extractTicker(params.ticker).toUpperCase()
  const date = extractDate(params.date)

  // Fetch from Yahoo Finance - use ticker as-is from autocomplete
  const result = await fetchFromYahooFinance(ticker, ticker, date)
  return result
}
