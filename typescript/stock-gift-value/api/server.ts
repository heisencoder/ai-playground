import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { handleStockPriceRequest } from './handler.js'
import { searchTickers } from './tickerSearchClient.js'
import { DEFAULT_PORT, HTTP_STATUS } from './constants.js'
import { logger } from './logger.js'
import type { ClientErrorPayload } from '../shared/types.js'

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
 * Client error logging endpoint
 * POST /api/log-client-error
 * Receives and logs errors that occur in the client-side JavaScript
 */
app.post('/api/log-client-error', (req, res) => {
  try {
    const errorData = req.body as ClientErrorPayload

    // Log the client-side error with clear distinction from server errors
    logger.error('═══════════════════════════════════════════════════')
    logger.error('CLIENT-SIDE ERROR (not a server error)')
    logger.error('═══════════════════════════════════════════════════')
    logger.error(`Type: ${errorData.type ?? 'unknown'}`)
    logger.error(`Message: ${errorData.message ?? 'No message provided'}`)
    logger.error(`URL: ${errorData.url ?? 'unknown'}`)

    if (errorData.lineNumber !== undefined || errorData.columnNumber !== undefined) {
      logger.error(
        `Location: Line ${errorData.lineNumber ?? 'unknown'}, Column ${errorData.columnNumber ?? 'unknown'}`
      )
    }

    logger.error(`Timestamp: ${errorData.timestamp ?? 'unknown'}`)
    logger.error(`User Agent: ${errorData.userAgent ?? 'unknown'}`)

    if (errorData.stack) {
      logger.error('Stack trace:')
      logger.error(errorData.stack)
    }

    if (errorData.additionalContext) {
      logger.error('Additional context:')
      logger.error(JSON.stringify(errorData.additionalContext, null, 2))
    }

    logger.error('═══════════════════════════════════════════════════')

    // Acknowledge receipt
    return res.status(HTTP_STATUS.OK).json({
      status: 'logged',
      message: 'Client error logged successfully',
    })
  } catch (error) {
    logger.error('Failed to log client error:', error)
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to log client error',
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
  // Note: __dirname is dist-server/api/, so we need to go up two levels to reach /app
  const distPath = path.join(__dirname, '..', '..', 'dist')
  app.use(express.static(distPath))

  // Fallback to index.html for client-side routing (SPA)
  // Use middleware for catch-all route (Express 5 compatible)
  app.use((_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Start server
const server = app.listen(PORT, () => {
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
  logger.info(
    `  - Client Error Logging: http://localhost:${PORT}/api/log-client-error`
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

/**
 * Graceful shutdown handler for SIGTERM and SIGINT signals
 * This is critical for Cloud Run and Docker environments where the app runs as PID 1
 */
const SHUTDOWN_TIMEOUT_MS = 10000 // 10 seconds

function gracefulShutdown(signal: string): void {
  logger.info(`\n${signal} signal received: closing HTTP server`)
  server.close(() => {
    logger.info('HTTP server closed')
    process.exit(0)
  })

  // Force shutdown after timeout if graceful shutdown fails
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
}

// Handle SIGTERM (sent by Cloud Run and docker stop)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// Handle SIGINT (Ctrl+C in terminal)
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

export default app
