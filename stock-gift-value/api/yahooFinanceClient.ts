/**
 * Yahoo Finance API client
 */

import { HTTP_STATUS, SECONDS_PER_DAY } from './constants.js'
import type { StockPriceData, StockPriceResponse } from '../shared/types.js'

/**
 * Split event from Yahoo Finance
 */
interface SplitEvent {
  date: number
  numerator: number
  denominator: number
  splitRatio?: string
}

/**
 * Yahoo Finance API response structure
 */
interface YahooFinanceResponse {
  chart?: {
    result?: Array<{
      indicators?: {
        quote?: Array<{
          high?: (number | null)[]
          low?: (number | null)[]
        }>
      }
      events?: {
        splits?: Record<string, SplitEvent>
      }
    }>
    error?: {
      description?: string
    }
  }
}

/**
 * Build Yahoo Finance API URL for stock price data
 * Fetches from target date to now to capture any splits that occurred after the gift date
 */
function buildYahooFinanceUrl(
  normalizedTicker: string,
  date: string
): string {
  const targetDate = new Date(date)
  const startTimestamp = Math.floor(targetDate.getTime() / 1000)
  // Fetch to current time to get all splits after the gift date
  const endTimestamp = Math.floor(Date.now() / 1000)

  return `https://query1.finance.yahoo.com/v8/finance/chart/${normalizedTicker}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d&events=split`
}

/**
 * Validate Yahoo Finance API response structure
 */
function validateYahooResponse(
  json: YahooFinanceResponse
): StockPriceResponse | undefined {
  if (
    !json.chart ||
    !json.chart.result ||
    json.chart.result.length === 0 ||
    json.chart.error
  ) {
    return {
      status: HTTP_STATUS.BAD_REQUEST,
      error: json.chart?.error?.description ?? 'Invalid response from API',
    }
  }

  return undefined
}

/**
 * Calculate the cumulative split ratio for all splits that occurred after the target date.
 * Yahoo Finance returns split-adjusted historical prices, so we need to multiply
 * by this ratio to get the original unadjusted prices.
 *
 * For example, if a stock had a 4-for-1 split after the gift date:
 * - Yahoo returns adjusted price: $25
 * - Split ratio: 4/1 = 4
 * - Original price: $25 * 4 = $100
 */
function calculateSplitAdjustment(
  splits: Record<string, SplitEvent> | undefined,
  targetDateTimestamp: number
): number {
  if (!splits) {
    return 1
  }

  let cumulativeRatio = 1

  for (const split of Object.values(splits)) {
    // Only include splits that occurred AFTER the target date
    if (split.date > targetDateTimestamp) {
      // numerator = new shares, denominator = old shares
      // e.g., 4-for-1 split: numerator=4, denominator=1
      // To undo: multiply adjusted price by (numerator / denominator)
      cumulativeRatio *= split.numerator / split.denominator
    }
  }

  return cumulativeRatio
}

/**
 * Extract stock price data from Yahoo Finance response
 * Adjusts prices to undo any stock splits that occurred after the target date
 */
function extractStockPriceData(
  json: YahooFinanceResponse,
  ticker: string,
  date: string
): StockPriceResponse {
  const result = json.chart?.result?.[0]
  const quote = result?.indicators?.quote?.[0]

  if (!quote || !quote.high || !quote.low) {
    return {
      status: HTTP_STATUS.NOT_FOUND,
      error: 'No price data available for the specified date',
    }
  }

  // Get the first day's data (the target date)
  const adjustedHigh = quote.high[0]
  const adjustedLow = quote.low[0]

  if (
    adjustedHigh === null ||
    adjustedHigh === undefined ||
    adjustedLow === null ||
    adjustedLow === undefined
  ) {
    return {
      status: HTTP_STATUS.NOT_FOUND,
      error:
        'No trading data available for this date (market may have been closed)',
    }
  }

  // Calculate split adjustment to get original unadjusted prices
  const targetDate = new Date(date)
  // Use end of target day to only include splits that occurred on subsequent days
  const targetDateEndTimestamp =
    Math.floor(targetDate.getTime() / 1000) + SECONDS_PER_DAY

  const splitRatio = calculateSplitAdjustment(
    result?.events?.splits,
    targetDateEndTimestamp
  )

  // Multiply by split ratio to undo the adjustment
  const high = adjustedHigh * splitRatio
  const low = adjustedLow * splitRatio

  const stockData: StockPriceData = {
    date,
    high,
    low,
    ticker: ticker.toUpperCase(),
  }

  return {
    status: HTTP_STATUS.OK,
    data: stockData,
  }
}

/**
 * Fetch stock price data from Yahoo Finance API
 * Returns unadjusted prices by reversing any stock split adjustments
 */
export async function fetchFromYahooFinance(
  normalizedTicker: string,
  originalTicker: string,
  date: string
): Promise<StockPriceResponse> {
  try {
    const url = buildYahooFinanceUrl(normalizedTicker, date)
    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === HTTP_STATUS.NOT_FOUND) {
        return {
          status: HTTP_STATUS.NOT_FOUND,
          error: `Ticker symbol '${originalTicker}' not found`,
        }
      }
      return {
        status: response.status,
        error: `API request failed with status ${response.status}`,
      }
    }

    const json = (await response.json()) as YahooFinanceResponse

    const validationError = validateYahooResponse(json)
    if (validationError) {
      return validationError
    }

    return extractStockPriceData(json, originalTicker, date)
  } catch (error) {
    console.error('Error fetching stock price:', error)
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: 'Failed to fetch stock data',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
