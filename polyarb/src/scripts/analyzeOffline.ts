#!/usr/bin/env tsx
/**
 * Offline NFL Market Analysis
 * Reads pre-fetched JSON data and analyzes for arbitrage opportunities
 */

import { readFileSync } from 'fs'
import { ArbitrageDetector } from '../arbitrage/index.js'
import type { GammaMarket, GammaEvent, MarketWithOrderBook } from '../types/index.js'

const DECIMAL_PLACES_PERCENT = 2
const DECIMAL_PLACES_PRICE = 3
const DIVIDER_LENGTH = 60

function formatPercent(value: number): string {
  return `${value.toFixed(DECIMAL_PLACES_PERCENT)}%`
}

function formatPrice(value: number): string {
  return value.toFixed(DECIMAL_PLACES_PRICE)
}

function printDivider(): void {
  console.log('─'.repeat(DIVIDER_LENGTH))
}

/**
 * Extract team name from a question
 */
function extractTeamName(question: string): string {
  const match = question.match(/Will (?:the )?(.+?) win/i)
  if (match && match[1]) {
    return match[1]
  }
  return question.slice(0, 30)
}

/**
 * Convert event JSON to GammaMarket format
 */
function eventToMarket(event: GammaEvent & { markets: Array<GammaMarket & {
  groupItemTitle?: string;
  outcomePrices?: string;
  clobTokenIds?: string;
}> }): GammaMarket {
  const tokens: GammaMarket['tokens'] = []

  for (const market of event.markets) {
    // Skip closed markets with no active trading (already resolved)
    if (market.closed && !market.active) {
      continue
    }

    const groupTitle = market.groupItemTitle || extractTeamName(market.question)

    let price = 0
    if (market.outcomePrices) {
      try {
        const prices = JSON.parse(market.outcomePrices)
        price = parseFloat(prices[0]) || 0
      } catch {
        price = 0
      }
    }

    // Get token ID from clobTokenIds
    let tokenId = ''
    if (market.clobTokenIds) {
      try {
        const ids = JSON.parse(market.clobTokenIds)
        tokenId = ids[0] || ''
      } catch {
        tokenId = ''
      }
    }

    if (tokenId && groupTitle) {
      tokens.push({
        token_id: tokenId,
        outcome: groupTitle,
        price: price,
      })
    }
  }

  return {
    id: parseInt(event.id) || 0,
    question: event.title,
    slug: event.slug,
    conditionId: event.id,
    active: event.active,
    closed: event.closed,
    createdAt: event.markets?.[0]?.createdAt || new Date().toISOString(),
    endDate: event.endDate,
    tokens,
    tags: event.tags,
  }
}

/**
 * Print market prices
 */
function printMarketPrices(market: GammaMarket): void {
  console.log(`\n📊 ${market.question}`)
  printDivider()

  // Sort by price descending
  const sortedTokens = [...market.tokens].sort((a, b) => (b.price || 0) - (a.price || 0))

  // Calculate sum
  const sum = sortedTokens.reduce((acc, t) => acc + (t.price || 0), 0)

  console.log('\nOutcome Probabilities (Yes prices):')
  for (const token of sortedTokens) {
    const priceStr = formatPrice(token.price || 0)
    const pctStr = formatPercent((token.price || 0) * 100)
    console.log(`  ${token.outcome.padEnd(25)} ${priceStr} (${pctStr})`)
  }

  console.log(`\n  ${'TOTAL'.padEnd(25)} ${formatPrice(sum)} (${formatPercent(sum * 100)})`)

  if (sum > 1) {
    const overage = (sum - 1) * 100
    console.log(`\n  ⚠️  Overpriced by ${formatPercent(overage)} - potential arbitrage by selling all outcomes`)
  } else if (sum < 1) {
    const shortage = (1 - sum) * 100
    console.log(`\n  ⚠️  Underpriced by ${formatPercent(shortage)} - potential arbitrage by buying all outcomes`)
  }
}

/**
 * Main analysis function
 */
async function main(): Promise<void> {
  console.log('\n🏈 NFL Championship Market Analysis\n')
  console.log('═'.repeat(DIVIDER_LENGTH))

  // Read JSON files
  const superbowlData = JSON.parse(readFileSync('tmp/superbowl.json', 'utf-8'))
  const afcData = JSON.parse(readFileSync('tmp/afc.json', 'utf-8'))
  const nfcData = JSON.parse(readFileSync('tmp/nfc.json', 'utf-8'))

  // Convert to markets
  const superbowlMarket = eventToMarket(superbowlData)
  const afcMarket = eventToMarket(afcData)
  const nfcMarket = eventToMarket(nfcData)

  // Print prices for each market
  printMarketPrices(superbowlMarket)
  printMarketPrices(afcMarket)
  printMarketPrices(nfcMarket)

  // Cross-market analysis: compare conference vs super bowl prices
  console.log('\n\n═'.repeat(DIVIDER_LENGTH))
  console.log('🔍 Cross-Market Analysis: Conference vs Super Bowl')
  printDivider()

  // Build lookup maps
  const sbPrices = new Map<string, number>()
  for (const token of superbowlMarket.tokens) {
    sbPrices.set(token.outcome.toLowerCase(), token.price || 0)
  }

  const afcPrices = new Map<string, number>()
  for (const token of afcMarket.tokens) {
    afcPrices.set(token.outcome.toLowerCase(), token.price || 0)
  }

  const nfcPrices = new Map<string, number>()
  for (const token of nfcMarket.tokens) {
    nfcPrices.set(token.outcome.toLowerCase(), token.price || 0)
  }

  console.log('\nAFC Teams - Super Bowl vs Conference Championship:')
  for (const [team, confPrice] of afcPrices) {
    const sbPrice = sbPrices.get(team) || 0
    const diff = sbPrice - confPrice
    const symbol = diff > 0.005 ? '⚠️' : diff < -0.005 ? '🔴' : '✓'
    console.log(`  ${symbol} ${team.padEnd(25)} SB: ${formatPrice(sbPrice)}  AFC: ${formatPrice(confPrice)}  Diff: ${diff > 0 ? '+' : ''}${formatPrice(diff)}`)

    if (sbPrice > confPrice + 0.01) {
      console.log(`     ↳ Anomaly: Higher Super Bowl price than AFC Championship price!`)
    }
  }

  console.log('\nNFC Teams - Super Bowl vs Conference Championship:')
  for (const [team, confPrice] of nfcPrices) {
    const sbPrice = sbPrices.get(team) || 0
    const diff = sbPrice - confPrice
    const symbol = diff > 0.005 ? '⚠️' : diff < -0.005 ? '🔴' : '✓'
    console.log(`  ${symbol} ${team.padEnd(25)} SB: ${formatPrice(sbPrice)}  NFC: ${formatPrice(confPrice)}  Diff: ${diff > 0 ? '+' : ''}${formatPrice(diff)}`)

    if (sbPrice > confPrice + 0.01) {
      console.log(`     ↳ Anomaly: Higher Super Bowl price than NFC Championship price!`)
    }
  }

  // Check the specific case mentioned by user
  console.log('\n\n' + '═'.repeat(DIVIDER_LENGTH))
  console.log('🎯 Specific Analysis: Buffalo vs Denver/New England')
  printDivider()

  // Look up by partial match (case insensitive)
  const findPrice = (map: Map<string, number>, search: string): number => {
    for (const [key, value] of map) {
      if (key.toLowerCase().includes(search.toLowerCase())) {
        return value
      }
    }
    return 0
  }

  const buffaloSB = findPrice(sbPrices, 'buffalo')
  const buffaloAFC = findPrice(afcPrices, 'buffalo')
  const denverSB = findPrice(sbPrices, 'denver')
  const denverAFC = findPrice(afcPrices, 'denver')
  const patriotsSB = findPrice(sbPrices, 'new england')
  const patriotsAFC = findPrice(afcPrices, 'new england')

  console.log('\nTeam Comparison:')
  console.log(`  Buffalo:      Super Bowl ${formatPrice(buffaloSB)} (${formatPercent(buffaloSB*100)})  AFC ${formatPrice(buffaloAFC)} (${formatPercent(buffaloAFC*100)})`)
  console.log(`  Denver:       Super Bowl ${formatPrice(denverSB)} (${formatPercent(denverSB*100)})  AFC ${formatPrice(denverAFC)} (${formatPercent(denverAFC*100)})`)
  console.log(`  New England:  Super Bowl ${formatPrice(patriotsSB)} (${formatPercent(patriotsSB*100)})  AFC ${formatPrice(patriotsAFC)} (${formatPercent(patriotsAFC*100)})`)

  console.log('\nUser Observation Analysis:')
  console.log(`  Buffalo vs Denver in AFC:     Buffalo ${buffaloAFC > denverAFC ? '>' : buffaloAFC < denverAFC ? '<' : '='} Denver (${formatPercent(buffaloAFC*100)} vs ${formatPercent(denverAFC*100)})`)
  console.log(`  Buffalo vs Denver in SB:      Buffalo ${buffaloSB > denverSB ? '>' : buffaloSB < denverSB ? '<' : '='} Denver (${formatPercent(buffaloSB*100)} vs ${formatPercent(denverSB*100)})`)
  console.log(`  Buffalo vs Patriots in AFC:   Buffalo ${buffaloAFC > patriotsAFC ? '>' : buffaloAFC < patriotsAFC ? '<' : '='} Patriots (${formatPercent(buffaloAFC*100)} vs ${formatPercent(patriotsAFC*100)})`)
  console.log(`  Buffalo vs Patriots in SB:    Buffalo ${buffaloSB > patriotsSB ? '>' : buffaloSB < patriotsSB ? '<' : '='} Patriots (${formatPercent(buffaloSB*100)} vs ${formatPercent(patriotsSB*100)})`)

  // Look for arbitrage opportunities
  console.log('\n' + '─'.repeat(DIVIDER_LENGTH))
  console.log('Arbitrage Analysis:')

  let foundArbitrage = false

  // Buffalo vs Denver inconsistency
  if (buffaloAFC < denverAFC && buffaloSB > denverSB) {
    foundArbitrage = true
    console.log('\n  🎯 ARBITRAGE OPPORTUNITY: Buffalo vs Denver')
    console.log('  ──────────────────────────────────────────')
    console.log('  Buffalo is priced LOWER than Denver in AFC Championship')
    console.log('  but HIGHER than Denver in Super Bowl.')
    console.log('')
    console.log('  This is logically inconsistent! A team cannot win the Super Bowl')
    console.log('  without first winning their conference championship.')
    console.log('')
    console.log('  Market Prices:')
    console.log(`    AFC: Buffalo ${formatPercent(buffaloAFC*100)} < Denver ${formatPercent(denverAFC*100)}`)
    console.log(`    SB:  Buffalo ${formatPercent(buffaloSB*100)} > Denver ${formatPercent(denverSB*100)}`)
    console.log('')
    console.log('  Potential Trades:')
    console.log('    Option A: If you believe Buffalo is correctly priced for SB:')
    console.log('      - BUY Buffalo AFC Championship (underpriced relative to SB)')
    console.log('      - SELL Denver AFC Championship (overpriced relative to SB)')
    console.log('')
    console.log('    Option B: If you believe AFC pricing is correct:')
    console.log('      - SELL Buffalo Super Bowl (overpriced relative to AFC)')
    console.log('      - BUY Denver Super Bowl (underpriced relative to AFC)')
  }

  // Buffalo vs Patriots inconsistency
  if (buffaloAFC < patriotsAFC && buffaloSB > patriotsSB) {
    foundArbitrage = true
    console.log('\n  🎯 ARBITRAGE OPPORTUNITY: Buffalo vs New England')
    console.log('  ──────────────────────────────────────────────')
    console.log('  Buffalo is priced LOWER than New England in AFC Championship')
    console.log('  but HIGHER than New England in Super Bowl.')
    console.log('')
    console.log('  Market Prices:')
    console.log(`    AFC: Buffalo ${formatPercent(buffaloAFC*100)} < Patriots ${formatPercent(patriotsAFC*100)}`)
    console.log(`    SB:  Buffalo ${formatPercent(buffaloSB*100)} > Patriots ${formatPercent(patriotsSB*100)}`)
    console.log('')
    console.log('  Potential Trades:')
    console.log('    Option A: If you believe Buffalo is correctly priced for SB:')
    console.log('      - BUY Buffalo AFC Championship (underpriced relative to SB)')
    console.log('      - SELL New England AFC Championship (overpriced relative to SB)')
    console.log('')
    console.log('    Option B: If you believe AFC pricing is correct:')
    console.log('      - SELL Buffalo Super Bowl (overpriced relative to AFC)')
    console.log('      - BUY New England Super Bowl (underpriced relative to AFC)')
  }

  if (!foundArbitrage) {
    console.log('\n  ✅ No cross-market inconsistencies found between these teams.')
    console.log('  The relative pricing appears consistent across markets.')
  }

  // Calculate implied conditional probabilities
  console.log('\n' + '─'.repeat(DIVIDER_LENGTH))
  console.log('Implied Conditional Probabilities (P(Win SB | Win Conference)):')
  console.log('')

  if (buffaloAFC > 0) {
    const buffaloCondProb = buffaloSB / buffaloAFC
    console.log(`  Buffalo:     ${formatPercent(buffaloCondProb * 100)} chance of winning SB if they win AFC`)
  }
  if (denverAFC > 0) {
    const denverCondProb = denverSB / denverAFC
    console.log(`  Denver:      ${formatPercent(denverCondProb * 100)} chance of winning SB if they win AFC`)
  }
  if (patriotsAFC > 0) {
    const patriotsCondProb = patriotsSB / patriotsAFC
    console.log(`  New England: ${formatPercent(patriotsCondProb * 100)} chance of winning SB if they win AFC`)
  }

  console.log('\n  Note: If a team has a higher conditional probability than others,')
  console.log('  it implies the market believes they would perform better against')
  console.log('  the NFC opponent in the Super Bowl.')

  console.log('\n')
}

main().catch(console.error)
