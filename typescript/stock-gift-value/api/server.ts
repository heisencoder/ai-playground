import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { handleStockPriceRequest } from './handler.js'
import { searchTickers } from './tickerSearchClient.js'
import { DEFAULT_PORT, HTTP_STATUS } from './constants.js'
import { logger } from './logger.js'

/**
 * Standalone Express server for Stock Gift Value Calculator
 * Serves both API endpoints and static frontend files
 * Can be used for local development or production deployment
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT ?? DEFAULT_PORT
const NODE_ENV = process.env.NODE_ENV ?? 'development'

// Enable CORS
// In production, you may want to restrict this to specific origins
app.use(cors())

// Parse JSON bodies
app.use(express.json())

// Add basic request logging
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString()
  logger.info(`[${timestamp}] ${req.method} ${req.url}`)
  next()
})

/**
 * API Routes
 */

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  })
})

/**
 * Stock price endpoint
 * GET /api/stock-price?ticker=AAPL&date=2024-01-01
 */
app.get('/api/stock-price', async (req, res) => {
  try {
    // Call shared handler with query parameters
    const result = await handleStockPriceRequest(req.query)

    // Send response
    if (result.data) {
      return res.status(result.status).json(result.data)
    }

    const errorResponse: Record<string, string> = {
      error: result.error ?? 'Unknown error',
    }
    if (result.details) {
      errorResponse.details = result.details
    }
    return res.status(result.status).json(errorResponse)
  } catch (error) {
    logger.error('Unexpected error in API handler:', error)
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Ticker search endpoint
 * GET /api/ticker-search?q=AAPL
 */
app.get('/api/ticker-search', async (req, res) => {
  try {
    const query = req.query.q

    // Validate query parameter
    if (!query || typeof query !== 'string') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Query parameter "q" is required',
      })
    }

    // Search for tickers
    const result = await searchTickers(query)

    // Send response
    if (result.data) {
      return res.status(result.status).json(result.data)
    }

    const errorResponse: Record<string, string> = {
      error: result.error ?? 'Unknown error',
    }
    if (result.details) {
      errorResponse.details = result.details
    }
    return res.status(result.status).json(errorResponse)
  } catch (error) {
    logger.error('Unexpected error in ticker search:', error)
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Static file serving for production
 * In development, Vite dev server handles the frontend
 * In production, serve the built files from dist/
 */
if (NODE_ENV === 'production') {
  // Serve static files from the Vite build output
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))

  // Fallback to index.html for client-side routing (SPA)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Start server
app.listen(PORT, () => {
  logger.info(`\n=================================`)
  logger.info(`Stock Gift Value Calculator API`)
  logger.info(`=================================`)
  logger.info(`Environment: ${NODE_ENV}`)
  logger.info(`Server URL: http://localhost:${PORT}`)
  logger.info(`\nAPI Endpoints:`)
  logger.info(`  - Health: http://localhost:${PORT}/health`)
  logger.info(
    `  - Stock Price: http://localhost:${PORT}/api/stock-price?ticker=AAPL&date=2024-01-01`
  )
  logger.info(
    `  - Ticker Search: http://localhost:${PORT}/api/ticker-search?q=AAPL`
  )
  if (NODE_ENV === 'production') {
    logger.info(`\nServing static files from: dist/`)
  } else {
    logger.info(
      `\nDevelopment mode: Run Vite dev server separately with 'npm run dev'`
    )
  }
  logger.info(`=================================\n`)
})

export default app
