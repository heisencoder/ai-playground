/**
 * Tests for ArbitrageDetector - Underpriced Arbitrage Detection
 */

import { describe, it, expect } from 'vitest'
import { ArbitrageDetector } from '../detector.js'
import {
  underpricedMarket,
  underpricedOrderBooks,
  efficientMarket,
  efficientOrderBooks,
} from '../../test/fixtures/index.js'
import type { MarketWithOrderBook } from '../../types/index.js'

describe('ArbitrageDetector - detectUnderpricedArbitrage', () => {
  it('should detect arbitrage when outcomes sum to less than 1', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: underpricedMarket,
      orderBooks: underpricedOrderBooks,
    }

    const opportunities =
      detector.detectUnderpricedArbitrage(marketWithOrderBook)

    expect(opportunities.length).toBeGreaterThan(0)
    expect(opportunities[0]?.type).toBe('underpriced_outcomes')
    expect(opportunities[0]?.profitPercent).toBeGreaterThan(0)
  })

  it('should calculate correct profit percentage', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: underpricedMarket,
      orderBooks: underpricedOrderBooks,
    }

    const opportunities =
      detector.detectUnderpricedArbitrage(marketWithOrderBook)

    // With sum of 0.95, buying all at ask prices, profit should be ~5%
    // But we need to account for spreads - using asks which are higher
    expect(opportunities[0]?.profitPercent).toBeLessThan(10)
    expect(opportunities[0]?.profitPercent).toBeGreaterThan(0)
  })

  it('should not detect arbitrage for efficiently priced market', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: efficientMarket,
      orderBooks: efficientOrderBooks,
    }

    const opportunities =
      detector.detectUnderpricedArbitrage(marketWithOrderBook)

    expect(opportunities.length).toBe(0)
  })

  it('should include all trades needed for arbitrage', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: underpricedMarket,
      orderBooks: underpricedOrderBooks,
    }

    const opportunities =
      detector.detectUnderpricedArbitrage(marketWithOrderBook)
    const trades = opportunities[0]?.trades ?? []

    // Should have a BUY trade for each outcome
    expect(trades.length).toBe(underpricedMarket.tokens.length)
    expect(trades.every((t) => t.side === 'BUY')).toBe(true)
  })
})
