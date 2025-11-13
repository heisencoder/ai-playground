import express from 'express'
import cors from 'cors'
import { handleStockPriceRequest } from './handler.js'

/**
 * Local development server for testing API endpoints without Vercel
 * Uses the same shared handler logic as the Vercel serverless function
 */

const app = express()
const PORT = process.env.PORT || 3001

// Enable CORS for all origins in development
app.use(cors())

// Parse JSON bodies
app.use(express.json())

/**
 * Stock price endpoint - mirrors Vercel serverless function behavior
 * GET /api/stock-price?ticker=AAPL&date=2024-01-01
 */
app.get('/api/stock-price', async (req, res) => {
  try {
    // Call shared handler with query parameters
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
  } catch (error) {
    console.error('Unexpected error in dev server:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Development API server running at http://localhost:${PORT}`)
  console.log(`📊 Stock price endpoint: http://localhost:${PORT}/api/stock-price?ticker=AAPL&date=2024-01-01`)
  console.log(`❤️  Health check: http://localhost:${PORT}/health`)
})

export default app
