import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { handleStockPriceRequest } from './handler.js'

/**
 * Standalone Express server for Stock Gift Value Calculator
 * Serves both API endpoints and static frontend files
 * Can be used for local development or production deployment
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'

// Enable CORS
// In production, you may want to restrict this to specific origins
app.use(cors())

// Parse JSON bodies
app.use(express.json())

// Add basic request logging
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.url}`)
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
    console.error('Unexpected error in API handler:', error)
    return res.status(500).json({
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
  console.log(`\n=================================`)
  console.log(`Stock Gift Value Calculator API`)
  console.log(`=================================`)
  console.log(`Environment: ${NODE_ENV}`)
  console.log(`Server URL: http://localhost:${PORT}`)
  console.log(`\nAPI Endpoints:`)
  console.log(`  - Health: http://localhost:${PORT}/health`)
  console.log(`  - Stock Price: http://localhost:${PORT}/api/stock-price?ticker=AAPL&date=2024-01-01`)
  if (NODE_ENV === 'production') {
    console.log(`\nServing static files from: dist/`)
  } else {
    console.log(`\nDevelopment mode: Run Vite dev server separately with 'npm run dev'`)
  }
  console.log(`=================================\n`)
})

export default app
