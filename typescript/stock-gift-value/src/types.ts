export interface StockGift {
  id: string
  date: string // ISO date format
  ticker: string
  shares: number
  value?: number // Calculated value
  loading?: boolean
  error?: string
  cacheKey?: string // Cache key to track when to recalculate
}

export interface StockPriceData {
  date: string
  high: number
  low: number
  ticker: string
}

export interface CacheEntry {
  data: StockPriceData
  timestamp: number
}
