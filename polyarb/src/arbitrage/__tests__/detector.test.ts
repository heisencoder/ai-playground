import { describe, it, expect } from 'vitest'
import { ArbitrageDetector } from '../detector.js'
import {
  underpricedMarket,
  underpricedOrderBooks,
  overpricedMarket,
  overpricedOrderBooks,
  efficientMarket,
  efficientOrderBooks,
  thinLiquidityMarket,
  thinLiquidityOrderBooks,
  wideSpreadMarket,
  wideSpreadOrderBooks,
} from '../../test/fixtures/index.js'
import type { MarketWithOrderBook } from '../../types/index.js'

describe('ArbitrageDetector', () => {
  describe('calculateProbabilitySum', () => {
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
  })

  describe('detectUnderpricedArbitrage', () => {
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

  describe('detectOverpricedArbitrage', () => {
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
  })

  describe('analyzeMarket', () => {
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

  describe('calculateMaxSizeBeforeSlippage', () => {
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

  describe('confidence calculation', () => {
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
  })

  describe('spread impact', () => {
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
      const wideOpps = detector.detectUnderpricedArbitrage(
        wideSpreadMarketWithOB
      )

      const narrowProfit = narrowOpps[0]?.profitPercent ?? 0
      const wideProfit = wideOpps[0]?.profitPercent ?? 0

      // Wide spread should have lower profit (or none)
      expect(wideProfit).toBeLessThanOrEqual(narrowProfit)
    })
  })
})
