/**
 * NFL Market Test Fixtures
 * Based on real Polymarket data for Super Bowl LX (2026)
 *
 * These fixtures simulate the structure of Polymarket API responses
 * for Super Bowl, AFC Championship, and NFC Championship markets.
 */

import type { GammaMarket, OrderBookSummary } from '../../types/index.js'

/**
 * Super Bowl LX Champion Market (2026)
 * All teams that can potentially win the Super Bowl
 */
export const superBowlMarket: GammaMarket = {
  id: 23656,
  question: 'Who will win Super Bowl LX?',
  slug: 'super-bowl-champion-2026-731',
  conditionId: 'superbowl-2026-condition',
  active: true,
  closed: false,
  createdAt: '2025-09-01T00:00:00Z',
  endDate: '2026-02-08T23:59:59Z',
  volume: 674500000,
  tokens: [
    { token_id: 'sb-seahawks', outcome: 'Seahawks', price: 0.24 },
    { token_id: 'sb-rams', outcome: 'Rams', price: 0.21 },
    { token_id: 'sb-bills', outcome: 'Bills', price: 0.145 },
    { token_id: 'sb-patriots', outcome: 'Patriots', price: 0.12 },
    { token_id: 'sb-49ers', outcome: '49ers', price: 0.09 },
    { token_id: 'sb-bears', outcome: 'Bears', price: 0.07 },
    { token_id: 'sb-broncos', outcome: 'Broncos', price: 0.06 },
    { token_id: 'sb-texans', outcome: 'Texans', price: 0.055 },
  ],
  tags: ['NFL', 'Super Bowl', 'Sports'],
}

/**
 * AFC Championship Market (2026)
 * Teams from the AFC that can win the conference
 */
export const afcChampionMarket: GammaMarket = {
  id: 23657,
  question: 'Who will win the 2026 AFC Championship?',
  slug: 'afc-champion-1',
  conditionId: 'afc-2026-condition',
  active: true,
  closed: false,
  createdAt: '2025-09-01T00:00:00Z',
  endDate: '2026-01-26T23:59:59Z',
  volume: 1308050,
  tokens: [
    { token_id: 'afc-patriots', outcome: 'Patriots', price: 0.29 },
    { token_id: 'afc-bills', outcome: 'Bills', price: 0.26 },
    { token_id: 'afc-broncos', outcome: 'Broncos', price: 0.24 },
    { token_id: 'afc-texans', outcome: 'Texans', price: 0.21 },
  ],
  tags: ['NFL', 'AFC', 'Sports'],
}

/**
 * NFC Championship Market (2026)
 * Teams from the NFC that can win the conference
 */
export const nfcChampionMarket: GammaMarket = {
  id: 23658,
  question: 'Who will win the 2026 NFC Championship?',
  slug: 'nfc-champion-1',
  conditionId: 'nfc-2026-condition',
  active: true,
  closed: false,
  createdAt: '2025-09-01T00:00:00Z',
  endDate: '2026-01-26T23:59:59Z',
  volume: 1863481,
  tokens: [
    { token_id: 'nfc-seahawks', outcome: 'Seahawks', price: 0.43 },
    { token_id: 'nfc-rams', outcome: 'Rams', price: 0.37 },
    { token_id: 'nfc-49ers', outcome: '49ers', price: 0.12 },
    { token_id: 'nfc-bears', outcome: 'Bears', price: 0.08 },
  ],
  tags: ['NFL', 'NFC', 'Sports'],
}

/**
 * Create an order book for a token
 */
function createOrderBook(
  tokenId: string,
  midPrice: number,
  spread: number,
  depth: number = 5
): OrderBookSummary {
  const bids: Array<{ price: string; size: string }> = []
  const asks: Array<{ price: string; size: string }> = []

  const bestBid = midPrice - spread / 2
  const bestAsk = midPrice + spread / 2

  // Create bid levels (descending prices)
  for (let i = 0; i < depth; i++) {
    const price = Math.max(0.01, bestBid - i * 0.01)
    const size = (100 + i * 50).toString()
    bids.push({ price: price.toFixed(2), size })
  }

  // Create ask levels (ascending prices)
  for (let i = 0; i < depth; i++) {
    const price = Math.min(0.99, bestAsk + i * 0.01)
    const size = (100 + i * 50).toString()
    asks.push({ price: price.toFixed(2), size })
  }

  return {
    market: tokenId,
    asset_id: tokenId,
    timestamp: new Date().toISOString(),
    bids,
    asks,
    hash: `hash-${tokenId}-${Date.now()}`,
  }
}

/**
 * Order books for Super Bowl market tokens
 */
export const superBowlOrderBooks: Map<string, OrderBookSummary> = new Map([
  ['sb-seahawks', createOrderBook('sb-seahawks', 0.24, 0.02)],
  ['sb-rams', createOrderBook('sb-rams', 0.21, 0.02)],
  ['sb-bills', createOrderBook('sb-bills', 0.145, 0.02)],
  ['sb-patriots', createOrderBook('sb-patriots', 0.12, 0.02)],
  ['sb-49ers', createOrderBook('sb-49ers', 0.09, 0.02)],
  ['sb-bears', createOrderBook('sb-bears', 0.07, 0.02)],
  ['sb-broncos', createOrderBook('sb-broncos', 0.06, 0.02)],
  ['sb-texans', createOrderBook('sb-texans', 0.055, 0.02)],
])

/**
 * Order books for AFC Championship market tokens
 */
export const afcOrderBooks: Map<string, OrderBookSummary> = new Map([
  ['afc-patriots', createOrderBook('afc-patriots', 0.29, 0.02)],
  ['afc-bills', createOrderBook('afc-bills', 0.26, 0.02)],
  ['afc-broncos', createOrderBook('afc-broncos', 0.24, 0.02)],
  ['afc-texans', createOrderBook('afc-texans', 0.21, 0.02)],
])

/**
 * Order books for NFC Championship market tokens
 */
export const nfcOrderBooks: Map<string, OrderBookSummary> = new Map([
  ['nfc-seahawks', createOrderBook('nfc-seahawks', 0.43, 0.02)],
  ['nfc-rams', createOrderBook('nfc-rams', 0.37, 0.02)],
  ['nfc-49ers', createOrderBook('nfc-49ers', 0.12, 0.02)],
  ['nfc-bears', createOrderBook('nfc-bears', 0.08, 0.02)],
])

/**
 * All NFL markets for easy access
 */
export const allNflMarkets: GammaMarket[] = [
  superBowlMarket,
  afcChampionMarket,
  nfcChampionMarket,
]

/**
 * Mapping of team names to their conference
 */
export const teamConferenceMap: Record<string, 'AFC' | 'NFC'> = {
  Patriots: 'AFC',
  Bills: 'AFC',
  Broncos: 'AFC',
  Texans: 'AFC',
  Seahawks: 'NFC',
  Rams: 'NFC',
  '49ers': 'NFC',
  Bears: 'NFC',
}
