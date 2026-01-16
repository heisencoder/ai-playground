/**
 * Tests for ArbitrageDetector - Confidence and Slippage Calculation
 */

import { describe, it, expect } from 'vitest'
import { ArbitrageDetector } from '../detector.js'
import {
  underpricedMarket,
  underpricedOrderBooks,
  thinLiquidityMarket,
  thinLiquidityOrderBooks,
  wideSpreadMarket,
  wideSpreadOrderBooks,
  mediumLiquidityMarket,
  mediumLiquidityOrderBooks,
} from '../../test/fixtures/index.js'
import type { MarketWithOrderBook } from '../../types/index.js'

describe('ArbitrageDetector - Slippage calculation', () => {
  it('should calculate max size based on order book depth', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: underpricedMarket,
      orderBooks: underpricedOrderBooks,
    }

    const opportunities =
      detector.detectUnderpricedArbitrage(marketWithOrderBook)

    // Should have a reasonable max size based on order book
    expect(opportunities[0]?.maxSizeBeforeSlippage).toBeGreaterThan(0)
  })

  it('should return smaller size for thin order books', () => {
    const detector = new ArbitrageDetector()

    const normalMarket: MarketWithOrderBook = {
      market: underpricedMarket,
      orderBooks: underpricedOrderBooks,
    }

    const thinMarket: MarketWithOrderBook = {
      market: thinLiquidityMarket,
      orderBooks: thinLiquidityOrderBooks,
    }

    const normalOpps = detector.detectUnderpricedArbitrage(normalMarket)
    const thinOpps = detector.detectUnderpricedArbitrage(thinMarket)

    const normalMax = normalOpps[0]?.maxSizeBeforeSlippage ?? 0
    const thinMax = thinOpps[0]?.maxSizeBeforeSlippage ?? 0

    expect(thinMax).toBeLessThan(normalMax)
  })
})

describe('ArbitrageDetector - Confidence calculation', () => {
  it('should assign high confidence for deep order books', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: underpricedMarket,
      orderBooks: underpricedOrderBooks,
    }

    const opportunities =
      detector.detectUnderpricedArbitrage(marketWithOrderBook)

    expect(opportunities[0]?.confidence).toBe('high')
  })

  it('should assign lower confidence for thin order books', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: thinLiquidityMarket,
      orderBooks: thinLiquidityOrderBooks,
    }

    const opportunities =
      detector.detectUnderpricedArbitrage(marketWithOrderBook)

    expect(['low', 'medium']).toContain(opportunities[0]?.confidence)
  })

  it('should assign medium confidence for medium liquidity', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: mediumLiquidityMarket,
      orderBooks: mediumLiquidityOrderBooks,
    }

    const opportunities =
      detector.detectUnderpricedArbitrage(marketWithOrderBook)

    expect(opportunities[0]?.confidence).toBe('medium')
  })
})

describe('ArbitrageDetector - Spread impact', () => {
  it('should reduce profit when spreads are wide', () => {
    const detector = new ArbitrageDetector()

    const narrowSpreadMarket: MarketWithOrderBook = {
      market: underpricedMarket,
      orderBooks: underpricedOrderBooks,
    }

    const wideSpreadMarketWithOB: MarketWithOrderBook = {
      market: wideSpreadMarket,
      orderBooks: wideSpreadOrderBooks,
    }

    const narrowOpps = detector.detectUnderpricedArbitrage(narrowSpreadMarket)
    const wideOpps = detector.detectUnderpricedArbitrage(wideSpreadMarketWithOB)

    const narrowProfit = narrowOpps[0]?.profitPercent ?? 0
    const wideProfit = wideOpps[0]?.profitPercent ?? 0

    // Wide spread should have lower profit (or none)
    expect(wideProfit).toBeLessThanOrEqual(narrowProfit)
  })
})
