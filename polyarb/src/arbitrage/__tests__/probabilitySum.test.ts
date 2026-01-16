/**
 * Tests for ArbitrageDetector - Probability Sum Calculation
 */

import { describe, it, expect } from 'vitest'
import { ArbitrageDetector } from '../detector.js'
import {
  underpricedMarket,
  underpricedOrderBooks,
  overpricedMarket,
  overpricedOrderBooks,
  efficientMarket,
  efficientOrderBooks,
  partialOrderBookMarket,
  partialOrderBooks,
} from '../../test/fixtures/index.js'
import type { MarketWithOrderBook } from '../../types/index.js'

describe('ArbitrageDetector - calculateProbabilitySum', () => {
  it('should calculate sum of midpoint prices from order books', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: underpricedMarket,
      orderBooks: underpricedOrderBooks,
    }

    const sum = detector.calculateProbabilitySum(marketWithOrderBook)

    // Midpoints: 0.30, 0.25, 0.20, 0.20 = 0.95
    expect(sum).toBeCloseTo(0.95, 2)
  })

  it('should return sum greater than 1 for overpriced market', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: overpricedMarket,
      orderBooks: overpricedOrderBooks,
    }

    const sum = detector.calculateProbabilitySum(marketWithOrderBook)

    // Midpoints: 0.35, 0.32, 0.22, 0.19 = 1.08
    expect(sum).toBeCloseTo(1.08, 2)
  })

  it('should return exactly 1 for efficiently priced market', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: efficientMarket,
      orderBooks: efficientOrderBooks,
    }

    const sum = detector.calculateProbabilitySum(marketWithOrderBook)

    expect(sum).toBeCloseTo(1.0, 2)
  })

  it('should fall back to token.price when order book is missing', () => {
    const detector = new ArbitrageDetector()
    const marketWithOrderBook: MarketWithOrderBook = {
      market: partialOrderBookMarket,
      orderBooks: partialOrderBooks,
    }

    const sum = detector.calculateProbabilitySum(marketWithOrderBook)

    // partial-a and partial-b have order books (midpoint ~0.4 and ~0.3)
    // partial-c and partial-d use token.price (0.2 and 0.1)
    expect(sum).toBeCloseTo(1.0, 2)
  })
})
