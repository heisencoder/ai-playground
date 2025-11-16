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
