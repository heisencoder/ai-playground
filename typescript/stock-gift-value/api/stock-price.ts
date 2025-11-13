import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleStockPriceRequest } from './handler.js'

/**
 * Vercel serverless function to fetch stock prices from Yahoo Finance
 * This is a thin wrapper around the shared handler logic
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

  // Call shared handler
  const result = await handleStockPriceRequest(req.query)

  // Send response
  if (result.data) {
    return res.status(result.status).json(result.data)
  } else {
    const errorResponse: Record<string, string> = {
      error: result.error || 'Unknown error',
    }
    if (result.details) {
      errorResponse.details = result.details
    }
    return res.status(result.status).json(errorResponse)
  }
}
