/**
 * Arbitrage Detection Types
 */

import type { OrderBookSummary, GammaMarket } from './polymarket.js'

/**
 * Represents a single outcome in a market with its pricing data
 */
export interface OutcomeData {
  /** Market identifier */
  marketId: string
  /** Token ID for this outcome */
  tokenId: string
  /** Human-readable outcome label */
  label: string
  /** Best bid price (highest buy offer) */
  bestBid: number
  /** Best ask price (lowest sell offer) */
  bestAsk: number
  /** Midpoint price */
  midpoint: number
  /** Bid-ask spread */
  spread: number
  /** Full order book for depth analysis */
  orderBook: OrderBookSummary
}

/**
 * A group of related markets that can have arbitrage opportunities
 * For example: Super Bowl Winner, AFC Champion, NFC Champion
 */
export interface MarketGroup {
  /** Name of the market group */
  name: string
  /** Markets in this group with their order books */
  markets: MarketWithOrderBook[]
  /** Relationship type between markets */
  relationshipType: MarketRelationship
}

/**
 * Market data combined with its order book
 */
export interface MarketWithOrderBook {
  /** Market metadata */
  market: GammaMarket
  /** Order books for each token in the market */
  orderBooks: Map<string, OrderBookSummary>
}

/**
 * Types of relationships between markets that create arbitrage opportunities
 */
export type MarketRelationship =
  /** Markets where sum of probabilities should equal 1 (e.g., all outcomes in a multi-outcome market) */
  | 'mutually_exclusive'
  /** Hierarchical relationship (e.g., AFC/NFC Champion -> Super Bowl Winner) */
  | 'hierarchical'
  /** Custom relationship with user-defined rules */
  | 'custom'

/**
 * Detected arbitrage opportunity
 */
export interface ArbitrageOpportunity {
  /** Type of arbitrage */
  type: ArbitrageType
  /** Human-readable description of the opportunity */
  description: string
  /** Expected profit percentage (before fees) */
  profitPercent: number
  /** Expected profit in absolute terms for a given stake */
  profitAbsolute: number
  /** Total stake required */
  totalStake: number
  /** Individual trades needed to exploit the opportunity */
  trades: ArbitrageTrade[]
  /** Confidence level based on order book depth */
  confidence: ArbitrageConfidence
  /** Maximum size before slippage becomes significant */
  maxSizeBeforeSlippage: number
}

/**
 * Types of arbitrage opportunities
 */
export type ArbitrageType =
  /** Probabilities sum to less than 1 - can buy all outcomes for profit */
  | 'underpriced_outcomes'
  /** Probabilities sum to more than 1 - can sell all outcomes for profit */
  | 'overpriced_outcomes'
  /** Cross-market arbitrage (e.g., AFC champ vs Super Bowl markets) */
  | 'cross_market'

/**
 * A single trade in an arbitrage strategy
 */
export interface ArbitrageTrade {
  /** Market identifier */
  marketId: string
  /** Token ID to trade */
  tokenId: string
  /** Outcome label */
  outcomeLabel: string
  /** Buy or Sell */
  side: 'BUY' | 'SELL'
  /** Quantity to trade */
  quantity: number
  /** Expected execution price */
  price: number
  /** Total cost (quantity * price) */
  cost: number
}

/**
 * Confidence level for an arbitrage opportunity
 */
export type ArbitrageConfidence = 'high' | 'medium' | 'low'

/**
 * Result of analyzing a market group for arbitrage
 */
export interface ArbitrageAnalysis {
  /** The market group analyzed */
  marketGroup: MarketGroup
  /** Total probability sum of all outcomes */
  probabilitySum: number
  /** Whether arbitrage exists */
  hasArbitrage: boolean
  /** Detected opportunities (empty if none) */
  opportunities: ArbitrageOpportunity[]
  /** Analysis timestamp */
  timestamp: Date
  /** Any warnings or notes */
  warnings: string[]
}

/**
 * Configuration for arbitrage detection
 */
export interface ArbitrageConfig {
  /** Minimum profit percentage to consider (default: 0.5%) */
  minProfitPercent: number
  /** Maximum slippage tolerance (default: 1%) */
  maxSlippagePercent: number
  /** Whether to consider order book depth */
  considerOrderBookDepth: boolean
  /** Minimum liquidity required per side */
  minLiquidityPerSide: number
}

/**
 * Default arbitrage detection configuration
 */
export const DEFAULT_ARBITRAGE_CONFIG: ArbitrageConfig = {
  minProfitPercent: 0.5,
  maxSlippagePercent: 1.0,
  considerOrderBookDepth: true,
  minLiquidityPerSide: 100,
}
