/**
 * Tests for ArbitrageDetector - Overpriced Arbitrage Detection
 */

import { describe, it, expect } from 'vitest'
import { ArbitrageDetector } from '../detector.js'
import {
  underpricedMarket,
  underpricedOrderBooks,
  overpricedMarket,
  overpricedOrderBooks,
  minimalOverpricedMarket,
  minimalOverpricedOrderBooks,
} from '../../test/fixtures/index.js'
import type { MarketWithOrderBook } from '../../types/index.js'

describe('ArbitrageDetector - detectOverpricedArbitrage', () => {
  it('should detect arbitrage when outcomes sum to more than 1', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: overpricedMarket,
      orderBooks: overpricedOrderBooks,
    }

    const opportunities =
      detector.detectOverpricedArbitrage(marketWithOrderBook)

    expect(opportunities.length).toBeGreaterThan(0)
    expect(opportunities[0]?.type).toBe('overpriced_outcomes')
    expect(opportunities[0]?.profitPercent).toBeGreaterThan(0)
  })

  it('should not detect overpriced arbitrage for underpriced market', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: underpricedMarket,
      orderBooks: underpricedOrderBooks,
    }

    const opportunities =
      detector.detectOverpricedArbitrage(marketWithOrderBook)

    expect(opportunities.length).toBe(0)
  })

  it('should include SELL trades for overpriced arbitrage', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: overpricedMarket,
      orderBooks: overpricedOrderBooks,
    }

    const opportunities =
      detector.detectOverpricedArbitrage(marketWithOrderBook)
    const trades = opportunities[0]?.trades ?? []

    expect(trades.every((t) => t.side === 'SELL')).toBe(true)
  })

  it('should not detect arbitrage when overpriced profit is below threshold', () => {
    const detector = new ArbitrageDetector({
      minProfitPercent: 5, // 5% minimum
    })
    const marketWithOrderBook: MarketWithOrderBook = {
      market: minimalOverpricedMarket,
      orderBooks: minimalOverpricedOrderBooks,
    }

    const opportunities =
      detector.detectOverpricedArbitrage(marketWithOrderBook)

    // 2% profit is below 5% threshold
    expect(opportunities.length).toBe(0)
  })
})
