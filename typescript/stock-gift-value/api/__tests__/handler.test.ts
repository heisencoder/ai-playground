import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  handleStockPriceRequest,
  normalizeTickerForYahoo,
  StockPriceRequest,
} from '../handler'

describe('normalizeTickerForYahoo', () => {
  it('should convert periods to hyphens', () => {
    expect(normalizeTickerForYahoo('BRK.B')).toBe('BRK-B')
    expect(normalizeTickerForYahoo('BRK.A')).toBe('BRK-A')
  })

  it('should handle tickers without periods', () => {
    expect(normalizeTickerForYahoo('AAPL')).toBe('AAPL')
    expect(normalizeTickerForYahoo('MSFT')).toBe('MSFT')
  })

  it('should handle multiple periods', () => {
    expect(normalizeTickerForYahoo('A.B.C')).toBe('A-B-C')
  })
})

describe('handleStockPriceRequest', () => {
  // Store original fetch and console.error
  const originalFetch = global.fetch
  const originalConsoleError = console.error

  beforeEach(() => {
    // Mock fetch for each test
    global.fetch = vi.fn()
    // Suppress console.error during tests to avoid confusing error output
    console.error = vi.fn()
  })

  afterEach(() => {
    // Restore original fetch and console.error
    global.fetch = originalFetch
    console.error = originalConsoleError
    vi.restoreAllMocks()
  })

  it('should return error when ticker is missing', async () => {
    const request: StockPriceRequest = {
      date: '2024-01-01',
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(400)
    expect(result.error).toBe('Ticker parameter is required')
    expect(result.data).toBeUndefined()
  })

  it('should return error when ticker is array but empty', async () => {
    const request: StockPriceRequest = {
      ticker: [],
      date: '2024-01-01',
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(400)
    expect(result.error).toBe('Ticker parameter is required')
  })

  it('should return error when date is missing', async () => {
    const request: StockPriceRequest = {
      ticker: 'AAPL',
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(400)
    expect(result.error).toBe('Date parameter is required')
    expect(result.data).toBeUndefined()
  })

  it('should return error when date is array but empty', async () => {
    const request: StockPriceRequest = {
      ticker: 'AAPL',
      date: [],
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(400)
    expect(result.error).toBe('Date parameter is required')
  })

  it('should handle array parameters by taking first element', async () => {
    const mockResponse = {
      chart: {
        result: [
          {
            indicators: {
              quote: [
                {
                  high: [150],
                  low: [140],
                },
              ],
            },
          },
        ],
      },
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const request: StockPriceRequest = {
      ticker: ['AAPL', 'MSFT'], // Array with multiple values
      date: ['2024-01-01', '2024-01-02'], // Array with multiple values
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(200)
    expect(result.data?.ticker).toBe('AAPL') // Should use first ticker
    expect(result.data?.date).toBe('2024-01-01') // Should use first date
  })

  it('should successfully fetch stock data', async () => {
    const mockResponse = {
      chart: {
        result: [
          {
            indicators: {
              quote: [
                {
                  high: [150],
                  low: [140],
                },
              ],
            },
          },
        ],
      },
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const request: StockPriceRequest = {
      ticker: 'AAPL',
      date: '2024-01-01',
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(200)
    expect(result.data).toEqual({
      date: '2024-01-01',
      high: 150,
      low: 140,
      ticker: 'AAPL',
    })
    expect(result.error).toBeUndefined()
  })

  it('should normalize ticker symbol for Yahoo Finance', async () => {
    const mockResponse = {
      chart: {
        result: [
          {
            indicators: {
              quote: [
                {
                  high: [500.16],
                  low: [493.35],
                },
              ],
            },
          },
        ],
      },
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const request: StockPriceRequest = {
      ticker: 'BRK.B',
      date: '2024-01-01',
    }

    await handleStockPriceRequest(request)

    // Verify fetch was called with normalized ticker (BRK-B not BRK.B)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('BRK-B')
    )
  })

  it('should return 404 when ticker not found', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const request: StockPriceRequest = {
      ticker: 'INVALID',
      date: '2024-01-01',
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(404)
    expect(result.error).toBe("Ticker symbol 'INVALID' not found")
  })

  it('should handle API errors', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const request: StockPriceRequest = {
      ticker: 'AAPL',
      date: '2024-01-01',
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(500)
    expect(result.error).toContain('API request failed')
  })

  it('should handle invalid API response structure', async () => {
    const mockResponse = {
      chart: {
        error: {
          description: 'Invalid symbol',
        },
      },
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const request: StockPriceRequest = {
      ticker: 'INVALID',
      date: '2024-01-01',
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(400)
    expect(result.error).toBe('Invalid symbol')
  })

  it('should handle missing quote data', async () => {
    const mockResponse = {
      chart: {
        result: [
          {
            indicators: {
              quote: [{}], // Empty quote
            },
          },
        ],
      },
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const request: StockPriceRequest = {
      ticker: 'AAPL',
      date: '2024-01-01',
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(404)
    expect(result.error).toBe('No price data available for the specified date')
  })

  it('should handle null high/low values (market closed)', async () => {
    const mockResponse = {
      chart: {
        result: [
          {
            indicators: {
              quote: [
                {
                  high: [null],
                  low: [null],
                },
              ],
            },
          },
        ],
      },
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const request: StockPriceRequest = {
      ticker: 'AAPL',
      date: '2024-01-01',
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(404)
    expect(result.error).toContain('market may have been closed')
  })

  it('should handle fetch errors', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    const request: StockPriceRequest = {
      ticker: 'AAPL',
      date: '2024-01-01',
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(500)
    expect(result.error).toBe('Failed to fetch stock data')
    expect(result.details).toBe('Network error')
  })

  it('should handle non-Error exceptions', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce('String error')

    const request: StockPriceRequest = {
      ticker: 'AAPL',
      date: '2024-01-01',
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(500)
    expect(result.error).toBe('Failed to fetch stock data')
    expect(result.details).toBe('Unknown error')
  })

  it('should uppercase ticker symbol', async () => {
    const mockResponse = {
      chart: {
        result: [
          {
            indicators: {
              quote: [
                {
                  high: [150],
                  low: [140],
                },
              ],
            },
          },
        ],
      },
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const request: StockPriceRequest = {
      ticker: 'aapl', // lowercase
      date: '2024-01-01',
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(200)
    expect(result.data?.ticker).toBe('AAPL') // Should be uppercase
  })
})
