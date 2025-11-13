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
 * Fetch stock price from backend API
 * The backend proxies requests to Yahoo Finance to avoid CORS issues
 */
async function fetchFromYahooFinance(
  ticker: string,
  date: string
): Promise<StockPriceData> {
  // Call our backend API endpoint
  const url = `/api/stock-price?ticker=${encodeURIComponent(ticker)}&date=${encodeURIComponent(date)}`

  const response = await fetch(url)

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }))
    throw new Error(
      errorData.error || `API request failed with status ${response.status}`
    )
  }

  const data: StockPriceData = await response.json()
  return data
}
