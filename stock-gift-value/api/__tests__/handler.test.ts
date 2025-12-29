import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { handleStockPriceRequest } from '../handler'
import type { StockPriceRequest } from '../../shared/types.js'

// HTTP Status codes
const HTTP_STATUS_OK = 200
const HTTP_STATUS_BAD_REQUEST = 400
const HTTP_STATUS_NOT_FOUND = 404
const HTTP_STATUS_INTERNAL_ERROR = 500

// Test constants
const TEST_TICKER_AAPL = 'AAPL'
const TEST_TICKER_INVALID = 'INVALID'
const TEST_DATE = '2024-01-01'
const PRICE_HIGH_150 = 150
const PRICE_LOW_140 = 140
const BRK_B_HIGH = 500.16
const BRK_B_LOW = 493.35

// Split event for mock responses
interface MockSplitEvent {
  date: number
  numerator: number
  denominator: number
}

// Helper to create mock Yahoo Finance response
interface MockYahooResponseOptions {
  high?: number | null
  low?: number | null
  hasError?: boolean
  errorDescription?: string
  emptyQuote?: boolean
  splits?: MockSplitEvent[]
}

function createMockYahooResponse(options: MockYahooResponseOptions = {}): unknown {
  const { high, low, hasError, errorDescription, emptyQuote, splits } = options

  if (hasError) {
    return {
      chart: {
        error: {
          description: errorDescription,
        },
      },
    }
  }

  if (emptyQuote) {
    return {
      chart: {
        result: [
          {
            indicators: {
              quote: [{}],
            },
          },
        ],
      },
    }
  }

  // Build splits object if provided
  const splitsObj: Record<string, MockSplitEvent> | undefined = splits
    ? splits.reduce(
        (acc, split) => {
          acc[split.date.toString()] = split
          return acc
        },
        {} as Record<string, MockSplitEvent>
      )
    : undefined

  return {
    chart: {
      result: [
        {
          indicators: {
            quote: [
              {
                high: high !== undefined ? [high] : undefined,
                low: low !== undefined ? [low] : undefined,
              },
            ],
          },
          ...(splitsObj && { events: { splits: splitsObj } }),
        },
      ],
    },
  }
}

// Helper to create mock fetch response
function createMockFetchResponse(
  data: unknown,
  status: number = HTTP_STATUS_OK
): Partial<Response> {
  const isOk = status >= HTTP_STATUS_OK && status < HTTP_STATUS_BAD_REQUEST
  return {
    ok: isOk,
    status,
    json: (): Promise<unknown> => Promise.resolve(data),
  }
}

describe('handleStockPriceRequest - Validation', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    console.error = vi.fn()
  })

  it('should return error when ticker is missing', async () => {
    const request: StockPriceRequest = { date: TEST_DATE }
    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.error).toBe('Ticker parameter is required')
    expect(result.data).toBeUndefined()
  })

  it('should return error when ticker is array but empty', async () => {
    const request: StockPriceRequest = { ticker: [], date: TEST_DATE }
    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.error).toBe('Ticker parameter is required')
  })

  it('should return error when date is missing', async () => {
    const request: StockPriceRequest = { ticker: TEST_TICKER_AAPL }
    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.error).toBe('Date parameter is required')
    expect(result.data).toBeUndefined()
  })

  it('should return error when date is array but empty', async () => {
    const request: StockPriceRequest = { ticker: TEST_TICKER_AAPL, date: [] }
    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.error).toBe('Date parameter is required')
  })
})

describe('handleStockPriceRequest - Successful Requests', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    console.error = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should handle array parameters by taking first element', async () => {
    const mockResponse = createMockYahooResponse({
      high: PRICE_HIGH_150,
      low: PRICE_LOW_140,
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const request: StockPriceRequest = {
      ticker: [TEST_TICKER_AAPL, 'MSFT'],
      date: [TEST_DATE, '2024-01-02'],
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_OK)
    expect(result.data?.ticker).toBe(TEST_TICKER_AAPL)
    expect(result.data?.date).toBe(TEST_DATE)
  })

  it('should successfully fetch stock data', async () => {
    const mockResponse = createMockYahooResponse({
      high: PRICE_HIGH_150,
      low: PRICE_LOW_140,
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const request: StockPriceRequest = {
      ticker: TEST_TICKER_AAPL,
      date: TEST_DATE,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_OK)
    expect(result.data).toEqual({
      date: TEST_DATE,
      high: PRICE_HIGH_150,
      low: PRICE_LOW_140,
      ticker: TEST_TICKER_AAPL,
    })
    expect(result.error).toBeUndefined()
  })

  it('should normalize ticker symbol for Yahoo Finance', async () => {
    const mockResponse = createMockYahooResponse({
      high: BRK_B_HIGH,
      low: BRK_B_LOW,
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const request: StockPriceRequest = {
      ticker: 'BRK-B',
      date: TEST_DATE,
    }

    await handleStockPriceRequest(request)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('BRK-B')
    )
  })

  it('should uppercase ticker symbol', async () => {
    const mockResponse = createMockYahooResponse({
      high: PRICE_HIGH_150,
      low: PRICE_LOW_140,
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const request: StockPriceRequest = {
      ticker: 'aapl',
      date: TEST_DATE,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_OK)
    expect(result.data?.ticker).toBe(TEST_TICKER_AAPL)
  })
})

describe('handleStockPriceRequest - Error Handling', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    console.error = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return 404 when ticker not found', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: HTTP_STATUS_NOT_FOUND,
    } as Response)

    const request: StockPriceRequest = {
      ticker: TEST_TICKER_INVALID,
      date: TEST_DATE,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_NOT_FOUND)
    expect(result.error).toBe("Ticker symbol 'INVALID' not found")
  })

  it('should handle API errors', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: HTTP_STATUS_INTERNAL_ERROR,
    } as Response)

    const request: StockPriceRequest = {
      ticker: TEST_TICKER_AAPL,
      date: TEST_DATE,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_INTERNAL_ERROR)
    expect(result.error).toContain('API request failed')
  })

  it('should handle invalid API response structure', async () => {
    const mockResponse = createMockYahooResponse({
      hasError: true,
      errorDescription: 'Invalid symbol',
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const request: StockPriceRequest = {
      ticker: TEST_TICKER_INVALID,
      date: TEST_DATE,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.error).toBe('Invalid symbol')
  })

  it('should handle missing quote data', async () => {
    const mockResponse = createMockYahooResponse({ emptyQuote: true })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const request: StockPriceRequest = {
      ticker: TEST_TICKER_AAPL,
      date: TEST_DATE,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_NOT_FOUND)
    expect(result.error).toBe('No price data available for the specified date')
  })

  it('should handle null high/low values (market closed)', async () => {
    const mockResponse = createMockYahooResponse({ high: null, low: null })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const request: StockPriceRequest = {
      ticker: TEST_TICKER_AAPL,
      date: TEST_DATE,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_NOT_FOUND)
    expect(result.error).toContain('market may have been closed')
  })

  it('should handle fetch errors', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    const request: StockPriceRequest = {
      ticker: TEST_TICKER_AAPL,
      date: TEST_DATE,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_INTERNAL_ERROR)
    expect(result.error).toBe('Failed to fetch stock data')
    expect(result.details).toBe('Network error')
  })

  it('should handle non-Error exceptions', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce('String error')

    const request: StockPriceRequest = {
      ticker: TEST_TICKER_AAPL,
      date: TEST_DATE,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_INTERNAL_ERROR)
    expect(result.error).toBe('Failed to fetch stock data')
    expect(result.details).toBe('Unknown error')
  })
})

describe('handleStockPriceRequest - Stock Split Adjustment', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    console.error = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return unadjusted prices when no splits occurred', async () => {
    const mockResponse = createMockYahooResponse({
      high: PRICE_HIGH_150,
      low: PRICE_LOW_140,
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const request: StockPriceRequest = {
      ticker: TEST_TICKER_AAPL,
      date: TEST_DATE,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_OK)
    expect(result.data?.high).toBe(PRICE_HIGH_150)
    expect(result.data?.low).toBe(PRICE_LOW_140)
  })

  it('should adjust prices for a 4-for-1 split after gift date', async () => {
    // Gift date: 2020-01-15 (timestamp: 1579046400)
    // Split date: 2020-08-31 (timestamp: 1598832000) - after gift
    // Yahoo returns split-adjusted prices, so we need to multiply by 4
    const giftDate = '2020-01-15'
    const splitTimestamp = 1598832000 // 2020-08-31

    const mockResponse = createMockYahooResponse({
      high: 25, // Split-adjusted price (original was $100)
      low: 24, // Split-adjusted price (original was $96)
      splits: [
        {
          date: splitTimestamp,
          numerator: 4,
          denominator: 1,
        },
      ],
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const request: StockPriceRequest = {
      ticker: TEST_TICKER_AAPL,
      date: giftDate,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_OK)
    // Prices should be multiplied by 4 to get original unadjusted values
    expect(result.data?.high).toBe(100)
    expect(result.data?.low).toBe(96)
  })

  it('should handle multiple splits after gift date', async () => {
    // Gift date: 2014-01-15
    // Split 1: 2014-06-09, 7-for-1
    // Split 2: 2020-08-31, 4-for-1
    // Total adjustment: 7 * 4 = 28
    const giftDate = '2014-01-15'

    const mockResponse = createMockYahooResponse({
      high: 5, // Split-adjusted price
      low: 4, // Split-adjusted price
      splits: [
        {
          date: 1402272000, // 2014-06-09
          numerator: 7,
          denominator: 1,
        },
        {
          date: 1598832000, // 2020-08-31
          numerator: 4,
          denominator: 1,
        },
      ],
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const request: StockPriceRequest = {
      ticker: TEST_TICKER_AAPL,
      date: giftDate,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_OK)
    // Prices should be multiplied by 28 (7 * 4)
    expect(result.data?.high).toBe(140)
    expect(result.data?.low).toBe(112)
  })

  it('should ignore splits that occurred before gift date', async () => {
    // Gift date: 2021-01-15
    // Split date: 2020-08-31 - BEFORE gift date, should be ignored
    const giftDate = '2021-01-15'
    const splitTimestamp = 1598832000 // 2020-08-31

    const mockResponse = createMockYahooResponse({
      high: 130,
      low: 125,
      splits: [
        {
          date: splitTimestamp,
          numerator: 4,
          denominator: 1,
        },
      ],
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const request: StockPriceRequest = {
      ticker: TEST_TICKER_AAPL,
      date: giftDate,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_OK)
    // Prices should NOT be adjusted since split was before gift date
    expect(result.data?.high).toBe(130)
    expect(result.data?.low).toBe(125)
  })

  it('should handle reverse splits (consolidation)', async () => {
    // Gift date: 2020-01-15
    // Reverse split: 1-for-10 (stock consolidation)
    const giftDate = '2020-01-15'

    const mockResponse = createMockYahooResponse({
      high: 50, // Post-consolidation adjusted price
      low: 45,
      splits: [
        {
          date: 1598832000,
          numerator: 1,
          denominator: 10, // 1-for-10 reverse split
        },
      ],
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const request: StockPriceRequest = {
      ticker: 'XYZ',
      date: giftDate,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_OK)
    // For reverse split, multiply by 1/10 = 0.1
    expect(result.data?.high).toBe(5)
    expect(result.data?.low).toBe(4.5)
  })
})
