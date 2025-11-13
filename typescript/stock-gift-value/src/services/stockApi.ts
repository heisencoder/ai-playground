import { StockPriceData } from '../types'
import { stockPriceCache } from './cache'

/**
 * Fetch historical stock price data for a given ticker and date
 * Uses Yahoo Finance API with caching to minimize API calls
 */
export async function fetchStockPrice(
  ticker: string,
  date: string
): Promise<StockPriceData> {
  const normalizedTicker = ticker.toUpperCase()

  // Check cache first
  const cached = stockPriceCache.get(normalizedTicker, date)
  if (cached) {
    return cached
  }

  // Fetch from API
  try {
    const data = await fetchFromYahooFinance(normalizedTicker, date)

    // Cache the result
    stockPriceCache.set(normalizedTicker, date, data)

    return data
  } catch (error) {
    throw new Error(
      `Failed to fetch stock data: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Fetch stock price from Yahoo Finance API
 */
async function fetchFromYahooFinance(
  ticker: string,
  date: string
): Promise<StockPriceData> {
  // Convert date to Unix timestamp
  const targetDate = new Date(date)
  const startTimestamp = Math.floor(targetDate.getTime() / 1000)
  // Add one day to get end of day
  const endTimestamp = startTimestamp + 86400

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`

  const response = await fetch(url)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Ticker symbol '${ticker}' not found`)
    }
    throw new Error(`API request failed with status ${response.status}`)
  }

  const json = await response.json()

  // Validate response structure
  if (
    !json.chart ||
    !json.chart.result ||
    json.chart.result.length === 0 ||
    json.chart.error
  ) {
    throw new Error(
      json.chart?.error?.description || 'Invalid response from API'
    )
  }

  const result = json.chart.result[0]
  const quote = result.indicators?.quote?.[0]

  if (!quote || !quote.high || !quote.low) {
    throw new Error('No price data available for the specified date')
  }

  // Get the first data point (should be the only one for a single day)
  const high = quote.high[0]
  const low = quote.low[0]

  if (high == null || low == null) {
    throw new Error(
      'No trading data available for this date (market may have been closed)'
    )
  }

  return {
    date,
    high,
    low,
    ticker,
  }
}

/**
 * Mock function for testing - simulates API responses
 * This can be used in tests to avoid making real API calls
 */
export function mockFetchStockPrice(
  ticker: string,
  date: string,
  high: number,
  low: number
): StockPriceData {
  const data: StockPriceData = {
    date,
    high,
    low,
    ticker: ticker.toUpperCase(),
  }

  // Store in cache so subsequent calls return the same data
  stockPriceCache.set(ticker, date, data)

  return data
}
