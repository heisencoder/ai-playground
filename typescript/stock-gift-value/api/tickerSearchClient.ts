/**
 * Yahoo Finance ticker search API client
 */

import yahooFinance from 'yahoo-finance2'
import { HTTP_STATUS } from './constants.js'

/**
 * Yahoo Finance search quote result structure
 */
interface YahooSearchQuote {
  symbol: string
  longname?: string
  shortname?: string
  exchange?: string
  quoteType?: string
}

/**
 * Yahoo Finance search API response structure
 */
interface YahooSearchResults {
  quotes: YahooSearchQuote[]
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
 * Fetch ticker search results from Yahoo Finance API using yahoo-finance2 library
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
    // Use yahoo-finance2 library which handles API authentication
    // Type assertion needed because yahoo-finance2 doesn't export proper types
    const searchResults = (yahooFinance.search(trimmedQuery, {
      quotesCount: 10,
      newsCount: 0,
    }) as unknown) as Promise<YahooSearchResults>

    const data = await searchResults

    // Transform results to our format
    const results: TickerSearchResult[] = data.quotes
      .filter((quote: YahooSearchQuote) => quote.symbol && quote.longname)
      .map((quote: YahooSearchQuote) => ({
        symbol: quote.symbol,
        name: quote.longname ?? quote.shortname ?? quote.symbol,
        exchange: quote.exchange,
        type: quote.quoteType,
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
