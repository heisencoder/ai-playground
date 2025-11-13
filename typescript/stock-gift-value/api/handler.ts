/**
 * Shared stock price handler logic
 * Used by both Vercel serverless function and local dev server
 */

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
 * Normalize ticker symbol for Yahoo Finance API
 * Yahoo Finance uses hyphens instead of periods (e.g., BRK-B instead of BRK.B)
 */
export function normalizeTickerForYahoo(ticker: string): string {
  return ticker.replace(/\./g, '-')
}

/**
 * Core handler logic for fetching stock prices
 * Platform-agnostic - works with any request/response adapter
 */
export async function handleStockPriceRequest(
  params: StockPriceRequest
): Promise<StockPriceResponse> {
  // Extract and validate ticker
  const ticker = Array.isArray(params.ticker) ? params.ticker[0] : params.ticker
  if (!ticker || typeof ticker !== 'string') {
    return {
      status: 400,
      error: 'Ticker parameter is required',
    }
  }

  // Extract and validate date
  const date = Array.isArray(params.date) ? params.date[0] : params.date
  if (!date || typeof date !== 'string') {
    return {
      status: 400,
      error: 'Date parameter is required',
    }
  }

  try {
    // Normalize ticker for Yahoo Finance (BRK.B → BRK-B)
    const normalizedTicker = normalizeTickerForYahoo(ticker.toUpperCase())

    // Convert date to Unix timestamp
    const targetDate = new Date(date)
    const startTimestamp = Math.floor(targetDate.getTime() / 1000)
    const endTimestamp = startTimestamp + 86400 // Add one day

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${normalizedTicker}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return {
          status: 404,
          error: `Ticker symbol '${ticker}' not found`,
        }
      }
      return {
        status: response.status,
        error: `API request failed with status ${response.status}`,
      }
    }

    const json = (await response.json()) as YahooFinanceResponse

    // Validate response structure
    if (
      !json.chart ||
      !json.chart.result ||
      json.chart.result.length === 0 ||
      json.chart.error
    ) {
      return {
        status: 400,
        error: json.chart?.error?.description || 'Invalid response from API',
      }
    }

    const result = json.chart.result[0]
    const quote = result.indicators?.quote?.[0]

    if (!quote || !quote.high || !quote.low) {
      return {
        status: 404,
        error: 'No price data available for the specified date',
      }
    }

    // Get the first data point (should be the only one for a single day)
    const high = quote.high[0]
    const low = quote.low[0]

    if (high == null || low == null) {
      return {
        status: 404,
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
      status: 200,
      data: stockData,
    }
  } catch (error) {
    console.error('Error fetching stock price:', error)
    return {
      status: 500,
      error: 'Failed to fetch stock data',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
