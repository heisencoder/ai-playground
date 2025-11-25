import { CacheEntry, StockPriceData } from '../types'

// No cache expiration needed - historical stock data never changes
class StockPriceCache {
  private cache: Map<string, CacheEntry> = new Map()

  /**
   * Generate a cache key from ticker and date
   */
  private getCacheKey(ticker: string, date: string): string {
    return `${ticker.toUpperCase()}-${date}`
  }

  /**
   * Get cached stock price data if it exists
   */
  get(ticker: string, date: string): StockPriceData | null {
    const key = this.getCacheKey(ticker, date)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    return entry.data
  }

  /**
   * Store stock price data in the cache
   */
  set(ticker: string, date: string, data: StockPriceData): void {
    const key = this.getCacheKey(ticker, date)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache size (for testing/debugging)
   */
  size(): number {
    return this.cache.size
  }
}

// Export a singleton instance
export const stockPriceCache = new StockPriceCache()
