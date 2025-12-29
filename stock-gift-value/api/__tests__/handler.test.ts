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

// Split test constants - 4-for-1 split scenario
const SPLIT_4_FOR_1_ADJUSTED_HIGH = 25
const SPLIT_4_FOR_1_ADJUSTED_LOW = 24
const SPLIT_4_FOR_1_ORIGINAL_HIGH = 100
const SPLIT_4_FOR_1_ORIGINAL_LOW = 96

// Split test constants - multiple splits scenario (7*4 = 28x)
const MULTI_SPLIT_ADJUSTED_HIGH = 5
const MULTI_SPLIT_ADJUSTED_LOW = 4
const MULTI_SPLIT_ORIGINAL_HIGH = 140
const MULTI_SPLIT_ORIGINAL_LOW = 112

// Split test constants - split before gift date (no adjustment)
const NO_ADJUSTMENT_HIGH = 130
const NO_ADJUSTMENT_LOW = 125

// Split test constants - reverse split scenario (1-for-10)
const REVERSE_SPLIT_ADJUSTED_HIGH = 50
const REVERSE_SPLIT_ADJUSTED_LOW = 45
const REVERSE_SPLIT_ORIGINAL_HIGH = 5
const REVERSE_SPLIT_ORIGINAL_LOW = 4.5

// Google split test constants - tests non-trivial split ratios
// Split 1: 2015-04-27, 10027455:10000000 (stock dividend with fractional ratio)
// Split 2: 2022-07-18, 20:1
// For a gift in early 2015 (before both splits):
// Cumulative ratio = (10027455/10000000) * (20/1) = 1.0027455 * 20 = 20.05491
const GOOG_SPLIT_1_NUMERATOR = 10027455
const GOOG_SPLIT_1_DENOMINATOR = 10000000
const GOOG_SPLIT_2_NUMERATOR = 20
const GOOG_SPLIT_2_DENOMINATOR = 1
const GOOG_SPLIT_1_TIMESTAMP = 1430092800 // 2015-04-27
const GOOG_SPLIT_2_TIMESTAMP = 1658102400 // 2022-07-18
const GOOG_GIFT_DATE = '2015-01-15'
const GOOG_ADJUSTED_HIGH = 50
const GOOG_ADJUSTED_LOW = 48
// Expected cumulative ratio: (10027455/10000000) * 20 = 20.05491
const GOOG_CUMULATIVE_RATIO = (GOOG_SPLIT_1_NUMERATOR / GOOG_SPLIT_1_DENOMINATOR) *
  (GOOG_SPLIT_2_NUMERATOR / GOOG_SPLIT_2_DENOMINATOR)
// Original prices = adjusted * cumulative ratio
const GOOG_ORIGINAL_HIGH = GOOG_ADJUSTED_HIGH * GOOG_CUMULATIVE_RATIO
const GOOG_ORIGINAL_LOW = GOOG_ADJUSTED_LOW * GOOG_CUMULATIVE_RATIO

// Precision for floating point comparisons
const FLOAT_PRECISION = 5

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
    // Gift date: 2020-01-15, Split date: 2020-08-31 (after gift)
    // Yahoo returns split-adjusted prices, so we need to multiply by 4
    const giftDate = '2020-01-15'
    const splitTimestamp = 1598832000 // 2020-08-31

    const mockResponse = createMockYahooResponse({
      high: SPLIT_4_FOR_1_ADJUSTED_HIGH,
      low: SPLIT_4_FOR_1_ADJUSTED_LOW,
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
    expect(result.data?.high).toBe(SPLIT_4_FOR_1_ORIGINAL_HIGH)
    expect(result.data?.low).toBe(SPLIT_4_FOR_1_ORIGINAL_LOW)
  })

  it('should handle multiple splits after gift date', async () => {
    // Gift date: 2014-01-15
    // Split 1: 2014-06-09, 7-for-1
    // Split 2: 2020-08-31, 4-for-1
    // Total adjustment: 7 * 4 = 28
    const giftDate = '2014-01-15'

    const mockResponse = createMockYahooResponse({
      high: MULTI_SPLIT_ADJUSTED_HIGH,
      low: MULTI_SPLIT_ADJUSTED_LOW,
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
    expect(result.data?.high).toBe(MULTI_SPLIT_ORIGINAL_HIGH)
    expect(result.data?.low).toBe(MULTI_SPLIT_ORIGINAL_LOW)
  })

  it('should ignore splits that occurred before gift date', async () => {
    // Gift date: 2021-01-15
    // Split date: 2020-08-31 - BEFORE gift date, should be ignored
    const giftDate = '2021-01-15'
    const splitTimestamp = 1598832000 // 2020-08-31

    const mockResponse = createMockYahooResponse({
      high: NO_ADJUSTMENT_HIGH,
      low: NO_ADJUSTMENT_LOW,
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
    expect(result.data?.high).toBe(NO_ADJUSTMENT_HIGH)
    expect(result.data?.low).toBe(NO_ADJUSTMENT_LOW)
  })

  it('should handle reverse splits (consolidation)', async () => {
    // Gift date: 2020-01-15
    // Reverse split: 1-for-10 (stock consolidation)
    const giftDate = '2020-01-15'

    const mockResponse = createMockYahooResponse({
      high: REVERSE_SPLIT_ADJUSTED_HIGH,
      low: REVERSE_SPLIT_ADJUSTED_LOW,
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
    expect(result.data?.high).toBe(REVERSE_SPLIT_ORIGINAL_HIGH)
    expect(result.data?.low).toBe(REVERSE_SPLIT_ORIGINAL_LOW)
  })

  it('should handle Google splits with non-trivial numerator/denominator', async () => {
    // Tests the 2015-04-27 Google split (10027455:10000000) and 2022-07-18 split (20:1)
    // This verifies the calculation works with non-1 values in both numerator and denominator
    const mockResponse = createMockYahooResponse({
      high: GOOG_ADJUSTED_HIGH,
      low: GOOG_ADJUSTED_LOW,
      splits: [
        {
          date: GOOG_SPLIT_1_TIMESTAMP,
          numerator: GOOG_SPLIT_1_NUMERATOR,
          denominator: GOOG_SPLIT_1_DENOMINATOR,
        },
        {
          date: GOOG_SPLIT_2_TIMESTAMP,
          numerator: GOOG_SPLIT_2_NUMERATOR,
          denominator: GOOG_SPLIT_2_DENOMINATOR,
        },
      ],
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const request: StockPriceRequest = {
      ticker: 'GOOG',
      date: GOOG_GIFT_DATE,
    }

    const result = await handleStockPriceRequest(request)

    expect(result.status).toBe(HTTP_STATUS_OK)
    // Cumulative ratio: (10027455/10000000) * (20/1) = 20.05491
    // Verify the calculation handles fractional ratios correctly
    expect(result.data?.high).toBeCloseTo(GOOG_ORIGINAL_HIGH, FLOAT_PRECISION)
    expect(result.data?.low).toBeCloseTo(GOOG_ORIGINAL_LOW, FLOAT_PRECISION)
  })
})
