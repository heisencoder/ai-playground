/**
 * Polymarket API Types
 * Based on the CLOB and Gamma API documentation
 */

/**
 * Price level in an order book (bid or ask)
 */
export interface OrderBookLevel {
  /** Price as a decimal string (0.00 to 1.00) */
  price: string
  /** Size/quantity available at this price level */
  size: string
}

/**
 * Order book summary for a token
 */
export interface OrderBookSummary {
  /** Market identifier */
  market: string
  /** Asset/token ID */
  asset_id: string
  /** Timestamp of the order book snapshot */
  timestamp: string
  /** Bid levels sorted by price descending (best bid first) */
  bids: OrderBookLevel[]
  /** Ask levels sorted by price ascending (best ask first) */
  asks: OrderBookLevel[]
  /** Hash for change detection */
  hash: string
}

/**
 * Token information within a market
 */
export interface Token {
  /** Unique token identifier */
  token_id: string
  /** Outcome label (e.g., "Yes", "No", or team name) */
  outcome: string
  /** Current price (0.00 to 1.00) */
  price?: number
  /** Winner status (for resolved markets) */
  winner?: boolean
}

/**
 * Market from Gamma API
 */
export interface GammaMarket {
  /** Numeric market ID */
  id: number
  /** Question/description */
  question: string
  /** URL-friendly identifier */
  slug: string
  /** Condition ID on-chain */
  conditionId: string
  /** Whether market is active */
  active: boolean
  /** Whether market has been resolved */
  closed: boolean
  /** Market creation timestamp */
  createdAt: string
  /** Tokens for this market (typically Yes/No or multiple outcomes) */
  tokens: Token[]
  /** 24h volume */
  volume24hr?: number
  /** Total volume */
  volume?: number
  /** Liquidity */
  liquidity?: number
  /** End date/time */
  endDate?: string
  /** Category/tags */
  tags?: string[]
  /** Resolution source */
  resolutionSource?: string
  /** Parent event ID */
  eventId?: string
}

/**
 * Event from Gamma API (groups related markets)
 */
export interface GammaEvent {
  /** Event ID */
  id: string
  /** Event title */
  title: string
  /** URL-friendly identifier */
  slug: string
  /** Description */
  description?: string
  /** Associated markets */
  markets: GammaMarket[]
  /** Category tags */
  tags?: string[]
  /** End date */
  endDate?: string
  /** Whether event is active */
  active: boolean
  /** Whether event is resolved */
  closed: boolean
}

/**
 * Price response from CLOB API
 */
export interface PriceResponse {
  /** Best price for buy side */
  buy?: string
  /** Best price for sell side */
  sell?: string
}

/**
 * Midpoint response from CLOB API
 */
export interface MidpointResponse {
  /** Midpoint price as decimal string */
  mid: string
}

/**
 * Spread response from CLOB API
 */
export interface SpreadResponse {
  /** Spread as decimal string */
  spread: string
}

/**
 * Simplified market response from CLOB API
 */
export interface SimplifiedMarket {
  /** Token ID for Yes outcome */
  token_id: string
  /** Current best price */
  price: string
  /** Outcome (Yes/No) */
  outcome: string
}
