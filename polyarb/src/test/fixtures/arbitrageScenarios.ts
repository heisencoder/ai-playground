/**
 * Arbitrage Scenario Test Fixtures
 *
 * These fixtures contain synthetic market data designed to create
 * specific arbitrage opportunities for testing the detection algorithm.
 */

import type { GammaMarket, OrderBookSummary } from '../../types/index.js'

/**
 * Create an order book with specific bid/ask prices
 */
function createOrderBookWithPrices(
  tokenId: string,
  bestBid: number,
  bestAsk: number,
  depth: number = 5
): OrderBookSummary {
  const bids: Array<{ price: string; size: string }> = []
  const asks: Array<{ price: string; size: string }> = []

  // Create bid levels (descending prices)
  for (let i = 0; i < depth; i++) {
    const price = Math.max(0.01, bestBid - i * 0.01)
    const size = (1000 - i * 100).toString()
    bids.push({ price: price.toFixed(3), size })
  }

  // Create ask levels (ascending prices)
  for (let i = 0; i < depth; i++) {
    const price = Math.min(0.99, bestAsk + i * 0.01)
    const size = (1000 - i * 100).toString()
    asks.push({ price: price.toFixed(3), size })
  }

  return {
    market: tokenId,
    asset_id: tokenId,
    timestamp: new Date().toISOString(),
    bids,
    asks,
    hash: `hash-${tokenId}-arb`,
  }
}

// ============================================================================
// Scenario 1: Underpriced Outcomes (Sum < 1)
// All outcomes in a market sum to less than 100%, creating arbitrage
// ============================================================================

/**
 * Market where all outcome probabilities sum to only 95%
 * Buying all outcomes guarantees a profit
 */
export const underpricedMarket: GammaMarket = {
  id: 99001,
  question: 'Underpriced Test Market - Who wins?',
  slug: 'underpriced-test-market',
  conditionId: 'underpriced-condition',
  active: true,
  closed: false,
  createdAt: '2025-01-01T00:00:00Z',
  tokens: [
    { token_id: 'under-a', outcome: 'Team A', price: 0.3 },
    { token_id: 'under-b', outcome: 'Team B', price: 0.25 },
    { token_id: 'under-c', outcome: 'Team C', price: 0.2 },
    { token_id: 'under-d', outcome: 'Team D', price: 0.2 },
    // Total: 0.95 (5% underpriced - arbitrage opportunity!)
  ],
}

export const underpricedOrderBooks: Map<string, OrderBookSummary> = new Map([
  ['under-a', createOrderBookWithPrices('under-a', 0.29, 0.31)],
  ['under-b', createOrderBookWithPrices('under-b', 0.24, 0.26)],
  ['under-c', createOrderBookWithPrices('under-c', 0.19, 0.21)],
  ['under-d', createOrderBookWithPrices('under-d', 0.19, 0.21)],
])

// ============================================================================
// Scenario 2: Overpriced Outcomes (Sum > 1)
// All outcomes in a market sum to more than 100%, creating arbitrage
// ============================================================================

/**
 * Market where all outcome probabilities sum to 108%
 * Selling all outcomes guarantees a profit
 */
export const overpricedMarket: GammaMarket = {
  id: 99002,
  question: 'Overpriced Test Market - Who wins?',
  slug: 'overpriced-test-market',
  conditionId: 'overpriced-condition',
  active: true,
  closed: false,
  createdAt: '2025-01-01T00:00:00Z',
  tokens: [
    { token_id: 'over-a', outcome: 'Team A', price: 0.35 },
    { token_id: 'over-b', outcome: 'Team B', price: 0.32 },
    { token_id: 'over-c', outcome: 'Team C', price: 0.22 },
    { token_id: 'over-d', outcome: 'Team D', price: 0.19 },
    // Total: 1.08 (8% overpriced - arbitrage opportunity!)
  ],
}

export const overpricedOrderBooks: Map<string, OrderBookSummary> = new Map([
  ['over-a', createOrderBookWithPrices('over-a', 0.34, 0.36)],
  ['over-b', createOrderBookWithPrices('over-b', 0.31, 0.33)],
  ['over-c', createOrderBookWithPrices('over-c', 0.21, 0.23)],
  ['over-d', createOrderBookWithPrices('over-d', 0.18, 0.2)],
])

// ============================================================================
// Scenario 3: Cross-Market Arbitrage (AFC/NFC vs Super Bowl)
// Inconsistency between conference and Super Bowl markets
// ============================================================================

/**
 * Super Bowl market with prices that don't align with conference markets
 * Team A's Super Bowl price is higher than their conference championship price
 * would imply (given they'd still need to win the Super Bowl after winning conf)
 */
export const crossMarketSuperBowl: GammaMarket = {
  id: 99003,
  question: 'Cross-Market Super Bowl - Who wins?',
  slug: 'cross-market-super-bowl',
  conditionId: 'cross-sb-condition',
  active: true,
  closed: false,
  createdAt: '2025-01-01T00:00:00Z',
  tokens: [
    // AFC teams - priced too high relative to AFC Championship market
    { token_id: 'cross-sb-teama', outcome: 'AFC Team A', price: 0.35 },
    { token_id: 'cross-sb-teamb', outcome: 'AFC Team B', price: 0.2 },
    // NFC teams - priced correctly
    { token_id: 'cross-sb-teamc', outcome: 'NFC Team C', price: 0.25 },
    { token_id: 'cross-sb-teamd', outcome: 'NFC Team D', price: 0.15 },
  ],
}

export const crossMarketAFC: GammaMarket = {
  id: 99004,
  question: 'Cross-Market AFC Championship - Who wins?',
  slug: 'cross-market-afc',
  conditionId: 'cross-afc-condition',
  active: true,
  closed: false,
  createdAt: '2025-01-01T00:00:00Z',
  tokens: [
    // Team A priced lower here than Super Bowl would suggest
    { token_id: 'cross-afc-teama', outcome: 'AFC Team A', price: 0.45 },
    { token_id: 'cross-afc-teamb', outcome: 'AFC Team B', price: 0.55 },
    // Total: 1.0 (correctly priced within market)
  ],
}

export const crossMarketNFC: GammaMarket = {
  id: 99005,
  question: 'Cross-Market NFC Championship - Who wins?',
  slug: 'cross-market-nfc',
  conditionId: 'cross-nfc-condition',
  active: true,
  closed: false,
  createdAt: '2025-01-01T00:00:00Z',
  tokens: [
    { token_id: 'cross-nfc-teamc', outcome: 'NFC Team C', price: 0.55 },
    { token_id: 'cross-nfc-teamd', outcome: 'NFC Team D', price: 0.45 },
    // Total: 1.0 (correctly priced within market)
  ],
}

export const crossMarketOrderBooks: Map<string, OrderBookSummary> = new Map([
  // Super Bowl order books
  ['cross-sb-teama', createOrderBookWithPrices('cross-sb-teama', 0.34, 0.36)],
  ['cross-sb-teamb', createOrderBookWithPrices('cross-sb-teamb', 0.19, 0.21)],
  ['cross-sb-teamc', createOrderBookWithPrices('cross-sb-teamc', 0.24, 0.26)],
  ['cross-sb-teamd', createOrderBookWithPrices('cross-sb-teamd', 0.14, 0.16)],
  // AFC order books
  ['cross-afc-teama', createOrderBookWithPrices('cross-afc-teama', 0.44, 0.46)],
  ['cross-afc-teamb', createOrderBookWithPrices('cross-afc-teamb', 0.54, 0.56)],
  // NFC order books
  ['cross-nfc-teamc', createOrderBookWithPrices('cross-nfc-teamc', 0.54, 0.56)],
  ['cross-nfc-teamd', createOrderBookWithPrices('cross-nfc-teamd', 0.44, 0.46)],
])

// ============================================================================
// Scenario 4: No Arbitrage (Efficiently Priced)
// Market that is correctly priced with no arbitrage opportunity
// ============================================================================

/**
 * Efficiently priced market - probabilities sum to exactly 100%
 */
export const efficientMarket: GammaMarket = {
  id: 99006,
  question: 'Efficient Test Market - Who wins?',
  slug: 'efficient-test-market',
  conditionId: 'efficient-condition',
  active: true,
  closed: false,
  createdAt: '2025-01-01T00:00:00Z',
  tokens: [
    { token_id: 'eff-a', outcome: 'Team A', price: 0.4 },
    { token_id: 'eff-b', outcome: 'Team B', price: 0.3 },
    { token_id: 'eff-c', outcome: 'Team C', price: 0.2 },
    { token_id: 'eff-d', outcome: 'Team D', price: 0.1 },
    // Total: 1.0 (no arbitrage)
  ],
}

export const efficientOrderBooks: Map<string, OrderBookSummary> = new Map([
  ['eff-a', createOrderBookWithPrices('eff-a', 0.39, 0.41)],
  ['eff-b', createOrderBookWithPrices('eff-b', 0.29, 0.31)],
  ['eff-c', createOrderBookWithPrices('eff-c', 0.19, 0.21)],
  ['eff-d', createOrderBookWithPrices('eff-d', 0.09, 0.11)],
])

// ============================================================================
// Scenario 5: Thin Order Book (Low Liquidity)
// Market with good pricing but very thin order book
// ============================================================================

/**
 * Create a thin order book with minimal liquidity
 */
function createThinOrderBook(
  tokenId: string,
  bestBid: number,
  bestAsk: number
): OrderBookSummary {
  return {
    market: tokenId,
    asset_id: tokenId,
    timestamp: new Date().toISOString(),
    bids: [
      { price: bestBid.toFixed(3), size: '10' },
      { price: (bestBid - 0.02).toFixed(3), size: '15' },
    ],
    asks: [
      { price: bestAsk.toFixed(3), size: '10' },
      { price: (bestAsk + 0.02).toFixed(3), size: '15' },
    ],
    hash: `hash-${tokenId}-thin`,
  }
}

export const thinLiquidityMarket: GammaMarket = {
  id: 99007,
  question: 'Thin Liquidity Market - Who wins?',
  slug: 'thin-liquidity-market',
  conditionId: 'thin-condition',
  active: true,
  closed: false,
  createdAt: '2025-01-01T00:00:00Z',
  tokens: [
    { token_id: 'thin-a', outcome: 'Team A', price: 0.28 },
    { token_id: 'thin-b', outcome: 'Team B', price: 0.25 },
    { token_id: 'thin-c', outcome: 'Team C', price: 0.24 },
    { token_id: 'thin-d', outcome: 'Team D', price: 0.18 },
    // Total: 0.95 (underpriced but thin liquidity)
  ],
}

export const thinLiquidityOrderBooks: Map<string, OrderBookSummary> = new Map([
  ['thin-a', createThinOrderBook('thin-a', 0.27, 0.29)],
  ['thin-b', createThinOrderBook('thin-b', 0.24, 0.26)],
  ['thin-c', createThinOrderBook('thin-c', 0.23, 0.25)],
  ['thin-d', createThinOrderBook('thin-d', 0.17, 0.19)],
])

// ============================================================================
// Scenario 6: Wide Spread (Large Bid-Ask Gap)
// Market with significant spreads that eat into arbitrage profits
// ============================================================================

export const wideSpreadMarket: GammaMarket = {
  id: 99008,
  question: 'Wide Spread Market - Who wins?',
  slug: 'wide-spread-market',
  conditionId: 'wide-condition',
  active: true,
  closed: false,
  createdAt: '2025-01-01T00:00:00Z',
  tokens: [
    { token_id: 'wide-a', outcome: 'Team A', price: 0.28 },
    { token_id: 'wide-b', outcome: 'Team B', price: 0.26 },
    { token_id: 'wide-c', outcome: 'Team C', price: 0.23 },
    { token_id: 'wide-d', outcome: 'Team D', price: 0.18 },
    // Total: 0.95 (looks like arbitrage but spread may kill it)
  ],
}

export const wideSpreadOrderBooks: Map<string, OrderBookSummary> = new Map([
  // 5% spreads
  ['wide-a', createOrderBookWithPrices('wide-a', 0.255, 0.305)],
  ['wide-b', createOrderBookWithPrices('wide-b', 0.235, 0.285)],
  ['wide-c', createOrderBookWithPrices('wide-c', 0.205, 0.255)],
  ['wide-d', createOrderBookWithPrices('wide-d', 0.155, 0.205)],
])
