/**
 * Yahoo Finance ticker search API client
 */

import { HTTP_STATUS } from './constants.js'

/**
 * Yahoo Finance search API response structure
 */
export interface YahooSearchResult {
  symbol: string
  name: string
  exchDisp?: string
  typeDisp?: string
}

interface YahooSearchResponse {
  quotes?: YahooSearchResult[]
  error?: {
    description?: string
  }
}

export interface TickerSearchResult {
  symbol: string
  name: string
  exchange?: string
  type?: string
}

export interface TickerSearchResponse {
  status: number
  data?: TickerSearchResult[]
  error?: string
  details?: string
}

/**
 * In-memory cache for ticker search results
 */
class TickerSearchCache {
  /* eslint-disable no-magic-numbers -- Time unit constants */
  private static readonly MILLISECONDS_PER_SECOND = 1000
  private static readonly SECONDS_PER_MINUTE = 60
  private static readonly MINUTES_PER_HOUR = 60
  private static readonly HOURS_PER_DAY = 24
  /* eslint-enable no-magic-numbers */

  private cache: Map<string, { results: TickerSearchResult[]; timestamp: number }> =
    new Map()
  private readonly CACHE_TTL =
    TickerSearchCache.MILLISECONDS_PER_SECOND *
    TickerSearchCache.SECONDS_PER_MINUTE *
    TickerSearchCache.MINUTES_PER_HOUR *
    TickerSearchCache.HOURS_PER_DAY // 24 hours

  get(query: string): TickerSearchResult[] | null {
    const normalizedQuery = query.toLowerCase().trim()
    const cached = this.cache.get(normalizedQuery)

    if (!cached) {
      return null
    }

    // Check if cache entry is still valid
    const age = Date.now() - cached.timestamp
    if (age > this.CACHE_TTL) {
      this.cache.delete(normalizedQuery)
      return null
    }

    return cached.results
  }

  set(query: string, results: TickerSearchResult[]): void {
    const normalizedQuery = query.toLowerCase().trim()
    this.cache.set(normalizedQuery, {
      results,
      timestamp: Date.now(),
    })
  }

  clear(): void {
    this.cache.clear()
  }
}

// Export singleton cache instance
export const tickerSearchCache = new TickerSearchCache()

/**
 * Build Yahoo Finance search API URL
 */
function buildYahooSearchUrl(query: string): string {
  const encodedQuery = encodeURIComponent(query)
  return `https://query1.finance.yahoo.com/v1/finance/search?q=${encodedQuery}&quotesCount=10&newsCount=0`
}

/**
 * Fetch ticker search results from Yahoo Finance API
 */
export async function searchTickers(query: string): Promise<TickerSearchResponse> {
  const trimmedQuery = query.trim()

  // Return empty results for empty queries
  if (!trimmedQuery) {
    return {
      status: HTTP_STATUS.OK,
      data: [],
    }
  }

  // Check cache first
  const cached = tickerSearchCache.get(trimmedQuery)
  if (cached) {
    return {
      status: HTTP_STATUS.OK,
      data: cached,
    }
  }

  try {
    const url = buildYahooSearchUrl(trimmedQuery)
    const response = await fetch(url)

    if (!response.ok) {
      return {
        status: response.status,
        error: `Search API request failed with status ${response.status}`,
      }
    }

    const json = (await response.json()) as YahooSearchResponse

    if (json.error) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        error: json.error.description ?? 'Invalid response from search API',
      }
    }

    // Transform Yahoo Finance results to our format
    const results: TickerSearchResult[] = (json.quotes ?? [])
      .filter((quote) => quote.symbol && quote.name)
      .map((quote) => ({
        symbol: quote.symbol,
        name: quote.name,
        exchange: quote.exchDisp,
        type: quote.typeDisp,
      }))
      .slice(0, 10) // Limit to 10 results

    // Cache the results
    tickerSearchCache.set(trimmedQuery, results)

    return {
      status: HTTP_STATUS.OK,
      data: results,
    }
  } catch (error) {
    console.error('Error searching tickers:', error)
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: 'Failed to search tickers',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
