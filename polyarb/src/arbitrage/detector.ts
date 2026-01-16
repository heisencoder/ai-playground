/**
 * Arbitrage Detection Algorithm
 *
 * Detects arbitrage opportunities in prediction markets by analyzing:
 * 1. Probability sums (should equal 1 for mutually exclusive outcomes)
 * 2. Order book depth and spreads
 * 3. Cross-market inconsistencies
 */

import type {
  ArbitrageAnalysis,
  ArbitrageConfig,
  ArbitrageConfidence,
  ArbitrageOpportunity,
  ArbitrageTrade,
  MarketWithOrderBook,
  OrderBookSummary,
} from '../types/index.js'

const MIN_LIQUIDITY_HIGH = 500
const MIN_LIQUIDITY_MEDIUM = 100
const PERCENTAGE_MULTIPLIER = 100
const DEFAULT_MIN_PROFIT_PERCENT = 0.5
const DEFAULT_MAX_SLIPPAGE_PERCENT = 1.0
const DEFAULT_MIN_LIQUIDITY = 100
const DECIMAL_PLACES = 3

/**
 * Arbitrage detection engine for prediction markets
 */
export class ArbitrageDetector {
  private readonly config: ArbitrageConfig

  constructor(config?: Partial<ArbitrageConfig>) {
    this.config = {
      minProfitPercent: config?.minProfitPercent ?? DEFAULT_MIN_PROFIT_PERCENT,
      maxSlippagePercent:
        config?.maxSlippagePercent ?? DEFAULT_MAX_SLIPPAGE_PERCENT,
      considerOrderBookDepth: config?.considerOrderBookDepth ?? true,
      minLiquidityPerSide: config?.minLiquidityPerSide ?? DEFAULT_MIN_LIQUIDITY,
    }
  }

  /**
   * Get the best bid price from an order book
   */
  private getBestBid(orderBook: OrderBookSummary): number {
    const firstBid = orderBook.bids[0]
    if (!firstBid) {
      return 0
    }
    return parseFloat(firstBid.price)
  }

  /**
   * Get the best ask price from an order book
   */
  private getBestAsk(orderBook: OrderBookSummary): number {
    const firstAsk = orderBook.asks[0]
    if (!firstAsk) {
      return 1
    }
    return parseFloat(firstAsk.price)
  }

  /**
   * Calculate the midpoint price from an order book
   */
  private getMidpoint(orderBook: OrderBookSummary): number {
    const bestBid = this.getBestBid(orderBook)
    const bestAsk = this.getBestAsk(orderBook)
    return (bestBid + bestAsk) / 2
  }

  /**
   * Calculate total liquidity available at best price
   */
  private getLiquidityAtBestPrice(
    orderBook: OrderBookSummary,
    side: 'bid' | 'ask'
  ): number {
    const levels = side === 'bid' ? orderBook.bids : orderBook.asks
    const firstLevel = levels[0]
    if (!firstLevel) {
      return 0
    }
    return parseFloat(firstLevel.size)
  }

  /**
   * Calculate the sum of probabilities (midpoints) for all outcomes
   */
  calculateProbabilitySum(marketWithOrderBook: MarketWithOrderBook): number {
    let sum = 0
    for (const token of marketWithOrderBook.market.tokens) {
      const orderBook = marketWithOrderBook.orderBooks.get(token.token_id)
      if (orderBook) {
        sum += this.getMidpoint(orderBook)
      } else if (token.price !== undefined) {
        sum += token.price
      }
    }
    return sum
  }

  /**
   * Calculate the sum of ask prices (cost to buy all outcomes)
   */
  private calculateAskSum(marketWithOrderBook: MarketWithOrderBook): number {
    let sum = 0
    for (const token of marketWithOrderBook.market.tokens) {
      const orderBook = marketWithOrderBook.orderBooks.get(token.token_id)
      if (orderBook) {
        sum += this.getBestAsk(orderBook)
      }
    }
    return sum
  }

  /**
   * Calculate the sum of bid prices (revenue from selling all outcomes)
   */
  private calculateBidSum(marketWithOrderBook: MarketWithOrderBook): number {
    let sum = 0
    for (const token of marketWithOrderBook.market.tokens) {
      const orderBook = marketWithOrderBook.orderBooks.get(token.token_id)
      if (orderBook) {
        sum += this.getBestBid(orderBook)
      }
    }
    return sum
  }

  /**
   * Calculate minimum liquidity across all outcomes
   */
  private calculateMinLiquidity(
    marketWithOrderBook: MarketWithOrderBook,
    side: 'bid' | 'ask'
  ): number {
    let minLiquidity = Infinity
    for (const token of marketWithOrderBook.market.tokens) {
      const orderBook = marketWithOrderBook.orderBooks.get(token.token_id)
      if (orderBook) {
        const liquidity = this.getLiquidityAtBestPrice(orderBook, side)
        if (liquidity < minLiquidity) {
          minLiquidity = liquidity
        }
      }
    }
    return minLiquidity === Infinity ? 0 : minLiquidity
  }

  /**
   * Determine confidence level based on liquidity
   */
  private determineConfidence(minLiquidity: number): ArbitrageConfidence {
    if (minLiquidity >= MIN_LIQUIDITY_HIGH) {
      return 'high'
    }
    if (minLiquidity >= MIN_LIQUIDITY_MEDIUM) {
      return 'medium'
    }
    return 'low'
  }

  /**
   * Create trades for buying all outcomes
   */
  private createBuyTrades(
    marketWithOrderBook: MarketWithOrderBook,
    quantity: number
  ): ArbitrageTrade[] {
    const trades: ArbitrageTrade[] = []

    for (const token of marketWithOrderBook.market.tokens) {
      const orderBook = marketWithOrderBook.orderBooks.get(token.token_id)
      if (orderBook) {
        const price = this.getBestAsk(orderBook)
        trades.push({
          marketId: marketWithOrderBook.market.slug,
          tokenId: token.token_id,
          outcomeLabel: token.outcome,
          side: 'BUY',
          quantity,
          price,
          cost: quantity * price,
        })
      }
    }

    return trades
  }

  /**
   * Create trades for selling all outcomes
   */
  private createSellTrades(
    marketWithOrderBook: MarketWithOrderBook,
    quantity: number
  ): ArbitrageTrade[] {
    const trades: ArbitrageTrade[] = []

    for (const token of marketWithOrderBook.market.tokens) {
      const orderBook = marketWithOrderBook.orderBooks.get(token.token_id)
      if (orderBook) {
        const price = this.getBestBid(orderBook)
        trades.push({
          marketId: marketWithOrderBook.market.slug,
          tokenId: token.token_id,
          outcomeLabel: token.outcome,
          side: 'SELL',
          quantity,
          price,
          cost: quantity * price,
        })
      }
    }

    return trades
  }

  /**
   * Detect underpriced arbitrage opportunities
   * When sum of ask prices < 1, buying all outcomes guarantees profit
   */
  detectUnderpricedArbitrage(
    marketWithOrderBook: MarketWithOrderBook
  ): ArbitrageOpportunity[] {
    const askSum = this.calculateAskSum(marketWithOrderBook)

    // If total cost to buy all outcomes >= 1, no arbitrage
    if (askSum >= 1) {
      return []
    }

    const profitPercent = (1 - askSum) * PERCENTAGE_MULTIPLIER
    if (profitPercent < this.config.minProfitPercent) {
      return []
    }

    const minLiquidity = this.calculateMinLiquidity(marketWithOrderBook, 'ask')
    const confidence = this.determineConfidence(minLiquidity)

    // Calculate max size before significant slippage
    const maxSizeBeforeSlippage = minLiquidity

    // Create trades for a unit stake
    const unitStake = 1
    const trades = this.createBuyTrades(marketWithOrderBook, unitStake)
    const totalStake = trades.reduce((sum, t) => sum + t.cost, 0)
    const profitAbsolute = unitStake - totalStake

    return [
      {
        type: 'underpriced_outcomes',
        description: `Buy all outcomes for ${askSum.toFixed(DECIMAL_PLACES)} to guarantee ${(1 - askSum).toFixed(DECIMAL_PLACES)} profit per unit`,
        profitPercent,
        profitAbsolute,
        totalStake,
        trades,
        confidence,
        maxSizeBeforeSlippage,
      },
    ]
  }

  /**
   * Detect overpriced arbitrage opportunities
   * When sum of bid prices > 1, selling all outcomes guarantees profit
   */
  detectOverpricedArbitrage(
    marketWithOrderBook: MarketWithOrderBook
  ): ArbitrageOpportunity[] {
    const bidSum = this.calculateBidSum(marketWithOrderBook)

    // If total revenue from selling all outcomes <= 1, no arbitrage
    if (bidSum <= 1) {
      return []
    }

    const profitPercent = (bidSum - 1) * PERCENTAGE_MULTIPLIER
    if (profitPercent < this.config.minProfitPercent) {
      return []
    }

    const minLiquidity = this.calculateMinLiquidity(marketWithOrderBook, 'bid')
    const confidence = this.determineConfidence(minLiquidity)

    // Calculate max size before significant slippage
    const maxSizeBeforeSlippage = minLiquidity

    // Create trades for a unit stake
    const unitStake = 1
    const trades = this.createSellTrades(marketWithOrderBook, unitStake)
    const totalRevenue = trades.reduce((sum, t) => sum + t.cost, 0)
    const profitAbsolute = totalRevenue - unitStake

    return [
      {
        type: 'overpriced_outcomes',
        description: `Sell all outcomes for ${bidSum.toFixed(DECIMAL_PLACES)} while only needing to pay out 1.00`,
        profitPercent,
        profitAbsolute,
        totalStake: unitStake,
        trades,
        confidence,
        maxSizeBeforeSlippage,
      },
    ]
  }

  /**
   * Analyze a market for all types of arbitrage opportunities
   */
  analyzeMarket(marketWithOrderBook: MarketWithOrderBook): ArbitrageAnalysis {
    const warnings: string[] = []

    // Check liquidity
    const askLiquidity = this.calculateMinLiquidity(marketWithOrderBook, 'ask')
    const bidLiquidity = this.calculateMinLiquidity(marketWithOrderBook, 'bid')
    const minLiquidity = Math.min(askLiquidity, bidLiquidity)

    if (minLiquidity < this.config.minLiquidityPerSide) {
      warnings.push(
        `Low liquidity warning: minimum ${minLiquidity.toFixed(0)} available (threshold: ${this.config.minLiquidityPerSide})`
      )
    }

    // Calculate probability sum
    const probabilitySum = this.calculateProbabilitySum(marketWithOrderBook)

    // Detect opportunities
    const underpricedOpps = this.detectUnderpricedArbitrage(marketWithOrderBook)
    const overpricedOpps = this.detectOverpricedArbitrage(marketWithOrderBook)

    const opportunities = [...underpricedOpps, ...overpricedOpps]

    return {
      marketGroup: {
        name: marketWithOrderBook.market.question,
        markets: [marketWithOrderBook],
        relationshipType: 'mutually_exclusive',
      },
      probabilitySum,
      hasArbitrage: opportunities.length > 0,
      opportunities,
      timestamp: new Date(),
      warnings,
    }
  }
}
