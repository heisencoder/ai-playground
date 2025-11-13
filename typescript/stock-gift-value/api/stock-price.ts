import type { VercelRequest, VercelResponse } from '@vercel/node'

interface StockPriceData {
  date: string
  high: number
  low: number
  ticker: string
}

/**
 * Normalize ticker symbol for Yahoo Finance API
 * Yahoo Finance uses hyphens instead of periods (e.g., BRK-B instead of BRK.B)
 */
function normalizeTickerForYahoo(ticker: string): string {
  return ticker.replace(/\./g, '-')
}

/**
 * Vercel serverless function to fetch stock prices from Yahoo Finance
 * This proxies requests to avoid CORS issues
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,OPTIONS,PATCH,DELETE,POST,PUT'
  )
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { ticker, date } = req.query

  // Validate parameters
  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Ticker parameter is required' })
  }

  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'Date parameter is required' })
  }

  try {
    // Normalize ticker for Yahoo Finance (BRK.B → BRK-B)
    const normalizedTicker = normalizeTickerForYahoo(ticker.toUpperCase())

    // Convert date to Unix timestamp
    const targetDate = new Date(date)
    const startTimestamp = Math.floor(targetDate.getTime() / 1000)
    const endTimestamp = startTimestamp + 86400 // Add one day

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${normalizedTicker}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: `Ticker symbol '${ticker}' not found` })
      }
      return res.status(response.status).json({ error: `API request failed with status ${response.status}` })
    }

    const json = await response.json()

    // Validate response structure
    if (
      !json.chart ||
      !json.chart.result ||
      json.chart.result.length === 0 ||
      json.chart.error
    ) {
      return res.status(400).json({
        error: json.chart?.error?.description || 'Invalid response from API',
      })
    }

    const result = json.chart.result[0]
    const quote = result.indicators?.quote?.[0]

    if (!quote || !quote.high || !quote.low) {
      return res.status(404).json({
        error: 'No price data available for the specified date',
      })
    }

    // Get the first data point (should be the only one for a single day)
    const high = quote.high[0]
    const low = quote.low[0]

    if (high == null || low == null) {
      return res.status(404).json({
        error: 'No trading data available for this date (market may have been closed)',
      })
    }

    const stockData: StockPriceData = {
      date,
      high,
      low,
      ticker: ticker.toUpperCase(),
    }

    // Return successful response
    return res.status(200).json(stockData)
  } catch (error) {
    console.error('Error fetching stock price:', error)
    return res.status(500).json({
      error: 'Failed to fetch stock data',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
