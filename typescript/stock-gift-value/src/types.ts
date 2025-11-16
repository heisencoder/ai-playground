import type { StockPriceData } from '../shared/types.js'

export interface StockGift {
  id: string
  date: string // ISO date format
  ticker: string
  shares: number
  value?: number | undefined // Calculated value - explicitly allow undefined
  loading?: boolean | undefined
  error?: string | undefined
  cacheKey?: string | undefined // Cache key to track when to recalculate
  tickerInputFocused?: boolean | undefined // Track if ticker field is being edited
}

// Re-export shared types for convenience
export type { StockPriceData }

export interface CacheEntry {
  data: StockPriceData
  timestamp: number
}
