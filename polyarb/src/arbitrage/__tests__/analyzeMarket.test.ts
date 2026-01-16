/**
 * Tests for ArbitrageDetector - Market Analysis
 */

import { describe, it, expect } from 'vitest'
import { ArbitrageDetector } from '../detector.js'
import {
  underpricedMarket,
  underpricedOrderBooks,
  efficientMarket,
  efficientOrderBooks,
  thinLiquidityMarket,
  thinLiquidityOrderBooks,
} from '../../test/fixtures/index.js'
import type { MarketWithOrderBook } from '../../types/index.js'

describe('ArbitrageDetector - analyzeMarket', () => {
  it('should return complete analysis for underpriced market', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: underpricedMarket,
      orderBooks: underpricedOrderBooks,
    }

    const analysis = detector.analyzeMarket(marketWithOrderBook)

    expect(analysis.hasArbitrage).toBe(true)
    expect(analysis.probabilitySum).toBeCloseTo(0.95, 2)
    expect(analysis.opportunities.length).toBeGreaterThan(0)
    expect(analysis.timestamp).toBeInstanceOf(Date)
  })

  it('should return no arbitrage for efficient market', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: efficientMarket,
      orderBooks: efficientOrderBooks,
    }

    const analysis = detector.analyzeMarket(marketWithOrderBook)

    expect(analysis.hasArbitrage).toBe(false)
    expect(analysis.opportunities.length).toBe(0)
  })

  it('should add warning for thin liquidity', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: thinLiquidityMarket,
      orderBooks: thinLiquidityOrderBooks,
    }

    const analysis = detector.analyzeMarket(marketWithOrderBook)

    expect(analysis.warnings.some((w) => w.includes('liquidity'))).toBe(true)
  })

  it('should respect minimum profit threshold in config', () => {
    const detector = new ArbitrageDetector({
      minProfitPercent: 10, // 10% minimum - higher than available
      maxSlippagePercent: 1,
      considerOrderBookDepth: true,
      minLiquidityPerSide: 100,
    })
    const marketWithOrderBook: MarketWithOrderBook = {
      market: underpricedMarket,
      orderBooks: underpricedOrderBooks,
    }

    const analysis = detector.analyzeMarket(marketWithOrderBook)

    // 5% profit available, but 10% required - no opportunities
    expect(analysis.hasArbitrage).toBe(false)
  })
})
