#!/usr/bin/env node

/**
 * Polyarb CLI - Polymarket Arbitrage Detection Tool
 *
 * Fetches market data from Polymarket and identifies arbitrage opportunities.
 */

import { Command } from 'commander'
import { PolymarketClient } from '../api/index.js'
import { ArbitrageDetector } from '../arbitrage/index.js'
import type {
  ArbitrageAnalysis,
  ArbitrageConfig,
  GammaMarket,
  MarketWithOrderBook,
} from '../types/index.js'

const PARALLEL_BATCH_SIZE = 10
const DECIMAL_PLACES_PERCENT = 2
const DECIMAL_PLACES_PRICE = 3
const DIVIDER_LENGTH = 60
const DEFAULT_SLIPPAGE_PERCENT = 1.0

/**
 * Format a number as a percentage string
 */
function formatPercent(value: number): string {
  return `${value.toFixed(DECIMAL_PLACES_PERCENT)}%`
}

/**
 * Format a price as a decimal string
 */
function formatPrice(value: number): string {
  return value.toFixed(DECIMAL_PLACES_PRICE)
}

/**
 * Print a divider line
 */
function printDivider(): void {
  console.log('─'.repeat(DIVIDER_LENGTH))
}

/**
 * Print market analysis results
 */
function printAnalysis(analysis: ArbitrageAnalysis): void {
  console.log(`\n📊 ${analysis.marketGroup.name}`)
  printDivider()

  console.log(`Probability Sum: ${formatPrice(analysis.probabilitySum)}`)

  if (analysis.warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    for (const warning of analysis.warnings) {
      console.log(`   - ${warning}`)
    }
  }

  if (!analysis.hasArbitrage) {
    console.log('\n✅ No arbitrage opportunities detected')
    return
  }

  console.log(
    `\n🎯 ${analysis.opportunities.length} Arbitrage Opportunity Found!`
  )

  for (const opp of analysis.opportunities) {
    console.log(`\nType: ${opp.type.replace(/_/g, ' ').toUpperCase()}`)
    console.log(`Description: ${opp.description}`)
    console.log(`Profit: ${formatPercent(opp.profitPercent)}`)
    console.log(`Confidence: ${opp.confidence.toUpperCase()}`)
    console.log(
      `Max Size (before slippage): ${opp.maxSizeBeforeSlippage.toFixed(0)}`
    )

    console.log('\n📝 Required Trades:')
    for (const trade of opp.trades) {
      const action = trade.side === 'BUY' ? '🟢 BUY' : '🔴 SELL'
      console.log(
        `   ${action} ${trade.outcomeLabel} @ ${formatPrice(trade.price)}`
      )
    }
  }
}

/**
 * Fetch market data and order books for analysis
 */
async function fetchMarketData(
  client: PolymarketClient,
  slugs: string[]
): Promise<MarketWithOrderBook[]> {
  console.log(`\n🔍 Fetching ${slugs.length} market(s)...`)

  const marketsWithOrderBooks: MarketWithOrderBook[] = []

  // Fetch all markets in parallel
  const marketPromises = slugs.map((slug) => client.getMarketBySlug(slug))
  const markets = await Promise.all(marketPromises)

  // Filter out null results
  const validMarkets: GammaMarket[] = []
  for (let i = 0; i < markets.length; i++) {
    const market = markets[i]
    const slug = slugs[i]
    if (market) {
      validMarkets.push(market)
    } else if (slug) {
      console.warn(`⚠️  Market not found: ${slug}`)
    }
  }

  if (validMarkets.length === 0) {
    return []
  }

  // Collect all token IDs for order book fetching
  const allTokenIds: string[] = []
  for (const market of validMarkets) {
    for (const token of market.tokens) {
      allTokenIds.push(token.token_id)
    }
  }

  console.log(`📚 Fetching ${allTokenIds.length} order book(s) in parallel...`)

  // Fetch order books in batches for efficiency
  const allOrderBooks = new Map<
    string,
    Awaited<ReturnType<typeof client.getOrderBook>>
  >()

  for (let i = 0; i < allTokenIds.length; i += PARALLEL_BATCH_SIZE) {
    const batch = allTokenIds.slice(i, i + PARALLEL_BATCH_SIZE)
    const batchOrderBooks = await client.getOrderBooks(batch)
    for (const [tokenId, orderBook] of batchOrderBooks) {
      allOrderBooks.set(tokenId, orderBook)
    }
  }

  // Build MarketWithOrderBook objects
  for (const market of validMarkets) {
    const orderBooks = new Map<
      string,
      Awaited<ReturnType<typeof client.getOrderBook>>
    >()
    for (const token of market.tokens) {
      const orderBook = allOrderBooks.get(token.token_id)
      if (orderBook) {
        orderBooks.set(token.token_id, orderBook)
      }
    }
    marketsWithOrderBooks.push({ market, orderBooks })
  }

  return marketsWithOrderBooks
}

/**
 * Options for the analyze command
 */
interface AnalyzeOptions {
  minProfit: string
  minLiquidity: string
  depth: boolean
}

/**
 * Handle the analyze command
 */
async function handleAnalyzeCommand(
  slugs: string[],
  options: AnalyzeOptions
): Promise<void> {
  const client = new PolymarketClient()

  const config: ArbitrageConfig = {
    minProfitPercent: parseFloat(options.minProfit),
    maxSlippagePercent: DEFAULT_SLIPPAGE_PERCENT,
    considerOrderBookDepth: options.depth,
    minLiquidityPerSide: parseFloat(options.minLiquidity),
  }

  const detector = new ArbitrageDetector(config)

  const marketsWithOrderBooks = await fetchMarketData(client, slugs)

  if (marketsWithOrderBooks.length === 0) {
    console.error('❌ No valid markets found')
    process.exit(1)
  }

  console.log(
    `\n✅ Successfully fetched ${marketsWithOrderBooks.length} market(s)`
  )

  // Analyze each market
  let totalOpportunities = 0
  for (const marketWithOrderBook of marketsWithOrderBooks) {
    const analysis = detector.analyzeMarket(marketWithOrderBook)
    printAnalysis(analysis)
    totalOpportunities += analysis.opportunities.length
  }

  // Summary
  printDivider()
  if (totalOpportunities > 0) {
    console.log(
      `\n🎉 Found ${totalOpportunities} arbitrage opportunit${totalOpportunities === 1 ? 'y' : 'ies'}!`
    )
  } else {
    console.log('\n📈 No arbitrage opportunities found across all markets')
  }
}

/**
 * Handle the search command
 */
async function handleSearchCommand(
  query: string,
  options: { limit: string }
): Promise<void> {
  const client = new PolymarketClient()

  console.log(`\n🔍 Searching for "${query}"...`)
  const markets = await client.searchMarkets(query)

  const limit = parseInt(options.limit, 10)
  const displayMarkets = markets.slice(0, limit)

  if (displayMarkets.length === 0) {
    console.log('No markets found')
    return
  }

  console.log(
    `\n📊 Found ${markets.length} market(s) (showing ${displayMarkets.length}):\n`
  )

  for (const market of displayMarkets) {
    console.log(`  ${market.slug}`)
    console.log(`    ${market.question}`)
    console.log(`    Tokens: ${market.tokens.length}`)
    if (market.volume !== undefined) {
      console.log(`    Volume: $${market.volume.toLocaleString()}`)
    }
    console.log('')
  }

  console.log('Use these slugs with the "analyze" command:')
  console.log(
    `  polyarb analyze ${displayMarkets.map((m) => m.slug).join(' ')}`
  )
}

/**
 * Handle the quick command
 */
async function handleQuickCommand(): Promise<void> {
  const client = new PolymarketClient()
  const detector = new ArbitrageDetector()

  const nflSlugs = [
    'super-bowl-champion-2026-731',
    'afc-champion-1',
    'nfc-champion-1',
  ]

  const marketsWithOrderBooks = await fetchMarketData(client, nflSlugs)

  if (marketsWithOrderBooks.length === 0) {
    console.log(
      '⚠️  Could not fetch NFL markets. They may not exist or have different slugs.'
    )
    console.log('Try using the "search" command to find current market slugs.')
    return
  }

  // Analyze each market
  for (const marketWithOrderBook of marketsWithOrderBooks) {
    const analysis = detector.analyzeMarket(marketWithOrderBook)
    printAnalysis(analysis)
  }
}

/**
 * Create and configure the CLI program
 */
function createProgram(): Command {
  const program = new Command()

  program
    .name('polyarb')
    .description('Polymarket Arbitrage Detection CLI Tool')
    .version('0.0.1')

  program
    .command('analyze')
    .description('Analyze markets for arbitrage opportunities')
    .argument(
      '<slugs...>',
      'Market slugs to analyze (e.g., super-bowl-champion-2026-731)'
    )
    .option('-p, --min-profit <percent>', 'Minimum profit percentage', '0.5')
    .option('-l, --min-liquidity <amount>', 'Minimum liquidity per side', '100')
    .option('--no-depth', 'Ignore order book depth analysis')
    .action(async (slugs: string[], options: AnalyzeOptions) => {
      try {
        await handleAnalyzeCommand(slugs, options)
      } catch (error) {
        console.error(
          '❌ Error:',
          error instanceof Error ? error.message : String(error)
        )
        process.exit(1)
      }
    })

  program
    .command('search')
    .description('Search for markets by query')
    .argument('<query>', 'Search query (e.g., "Super Bowl")')
    .option('-l, --limit <number>', 'Maximum results to return', '10')
    .action(async (query: string, options: { limit: string }) => {
      try {
        await handleSearchCommand(query, options)
      } catch (error) {
        console.error(
          '❌ Error:',
          error instanceof Error ? error.message : String(error)
        )
        process.exit(1)
      }
    })

  program
    .command('quick')
    .description('Quick analysis of popular NFL markets')
    .action(async () => {
      try {
        await handleQuickCommand()
      } catch (error) {
        console.error(
          '❌ Error:',
          error instanceof Error ? error.message : String(error)
        )
        process.exit(1)
      }
    })

  return program
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const program = createProgram()
  await program.parseAsync()
}

main().catch((error: unknown) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
