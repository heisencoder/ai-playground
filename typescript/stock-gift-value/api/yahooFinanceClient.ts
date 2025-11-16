/**
 * Yahoo Finance API client
 */

import { HTTP_STATUS, SECONDS_PER_DAY } from './constants.js'
import type { StockPriceData, StockPriceResponse } from '../shared/types.js'

/**
 * Yahoo Finance API response structure
 */
interface YahooFinanceResponse {
  chart?: {
    result?: Array<{
      indicators?: {
        quote?: Array<{
          high?: number[]
          low?: number[]
        }>
      }
    }>
    error?: {
      description?: string
    }
  }
}

/**
 * Build Yahoo Finance API URL for stock price data
 */
function buildYahooFinanceUrl(
  normalizedTicker: string,
  date: string
): string {
  const targetDate = new Date(date)
  const startTimestamp = Math.floor(targetDate.getTime() / 1000)
  const endTimestamp = startTimestamp + SECONDS_PER_DAY

  return `https://query1.finance.yahoo.com/v8/finance/chart/${normalizedTicker}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`
}

/**
 * Validate Yahoo Finance API response structure
 */
function validateYahooResponse(
  json: YahooFinanceResponse
): StockPriceResponse | null {
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

  return null
}

/**
 * Extract stock price data from Yahoo Finance response
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

  const high = quote.high[0]
  const low = quote.low[0]

  if (high === null || high === undefined || low === null || low === undefined) {
    return {
      status: HTTP_STATUS.NOT_FOUND,
      error:
        'No trading data available for this date (market may have been closed)',
    }
  }

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
