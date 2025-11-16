import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  searchTickers,
  tickerSearchCache,
  type TickerSearchResult,
} from '../tickerSearchClient'

// HTTP Status codes
const HTTP_STATUS_OK = 200
const HTTP_STATUS_BAD_REQUEST = 400
const HTTP_STATUS_INTERNAL_ERROR = 500

// Test constants
const TEST_QUERY_AAPL = 'AAPL'
const TEST_QUERY_EMPTY = ''

// Helper to create mock Yahoo Finance search response
interface MockYahooSearchResponseOptions {
  symbols?: string[]
  names?: string[]
  hasError?: boolean
  errorDescription?: string
}

function createMockYahooSearchResponse(
  options: MockYahooSearchResponseOptions = {}
): unknown {
  const { symbols, names, hasError, errorDescription } = options

  if (hasError) {
    return {
      error: {
        description: errorDescription,
      },
    }
  }

  if (!symbols || symbols.length === 0) {
    return {
      quotes: [],
    }
  }

  const quotes = symbols.map((symbol, index) => ({
    symbol,
    name: names?.[index] ?? `${symbol} Company`,
    exchDisp: 'NASDAQ',
    typeDisp: 'Equity',
  }))

  return {
    quotes,
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

describe('searchTickers', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    console.error = vi.fn()
    tickerSearchCache.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return empty results for empty query', async () => {
    const result = await searchTickers(TEST_QUERY_EMPTY)

    expect(result.status).toBe(HTTP_STATUS_OK)
    expect(result.data).toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should successfully search for tickers', async () => {
    const mockResponse = createMockYahooSearchResponse({
      symbols: ['AAPL'],
      names: ['Apple Inc.'],
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const result = await searchTickers(TEST_QUERY_AAPL)

    expect(result.status).toBe(HTTP_STATUS_OK)
    expect(result.data).toEqual([
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        type: 'Equity',
      },
    ])
    expect(result.error).toBeUndefined()
  })

  it('should cache search results', async () => {
    const mockResponse = createMockYahooSearchResponse({
      symbols: ['AAPL'],
      names: ['Apple Inc.'],
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    // First call
    await searchTickers(TEST_QUERY_AAPL)
    expect(global.fetch).toHaveBeenCalledTimes(1)

    // Second call should use cache
    const result = await searchTickers(TEST_QUERY_AAPL)
    expect(global.fetch).toHaveBeenCalledTimes(1) // Still 1
    expect(result.status).toBe(HTTP_STATUS_OK)
    expect(result.data).toEqual([
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        type: 'Equity',
      },
    ])
  })

  it('should normalize query for caching', async () => {
    const mockResponse = createMockYahooSearchResponse({
      symbols: ['AAPL'],
      names: ['Apple Inc.'],
    })

    vi.mocked(global.fetch).mockResolvedValue(
      createMockFetchResponse(mockResponse) as Response
    )

    // Search with different cases and whitespace
    await searchTickers('AAPL')
    await searchTickers('aapl')
    await searchTickers(' AAPL ')

    // Should only fetch once due to cache normalization
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple search results', async () => {
    const mockResponse = createMockYahooSearchResponse({
      symbols: ['GOOGL', 'GOOG'],
      names: ['Alphabet Inc. Class A', 'Alphabet Inc. Class C'],
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const result = await searchTickers('GOOG')

    expect(result.status).toBe(HTTP_STATUS_OK)
    expect(result.data).toHaveLength(2)
    expect(result.data?.[0].symbol).toBe('GOOGL')
    expect(result.data?.[1].symbol).toBe('GOOG')
  })

  it('should filter out results without symbol or name', async () => {
    const mockResponse = {
      quotes: [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: '', name: 'Invalid' }, // Missing symbol
        { symbol: 'MSFT', name: '' }, // Missing name
        { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      ],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const result = await searchTickers('test')

    expect(result.status).toBe(HTTP_STATUS_OK)
    expect(result.data).toHaveLength(2)
    expect(result.data?.map((r: TickerSearchResult) => r.symbol)).toEqual([
      'AAPL',
      'GOOGL',
    ])
  })

  it('should limit results to 10', async () => {
    const symbols = Array.from({ length: 15 }, (_, i) => `SYM${i}`)
    const names = Array.from({ length: 15 }, (_, i) => `Company ${i}`)

    const mockResponse = createMockYahooSearchResponse({
      symbols,
      names,
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const result = await searchTickers('test')

    expect(result.status).toBe(HTTP_STATUS_OK)
    expect(result.data).toHaveLength(10)
  })

  it('should handle API errors', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: HTTP_STATUS_INTERNAL_ERROR,
    } as Response)

    const result = await searchTickers(TEST_QUERY_AAPL)

    expect(result.status).toBe(HTTP_STATUS_INTERNAL_ERROR)
    expect(result.error).toContain('Search API request failed')
  })

  it('should handle invalid API response structure', async () => {
    const mockResponse = createMockYahooSearchResponse({
      hasError: true,
      errorDescription: 'Invalid query',
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const result = await searchTickers('INVALID')

    expect(result.status).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.error).toBe('Invalid query')
  })

  it('should handle fetch errors', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    const result = await searchTickers(TEST_QUERY_AAPL)

    expect(result.status).toBe(HTTP_STATUS_INTERNAL_ERROR)
    expect(result.error).toBe('Failed to search tickers')
    expect(result.details).toBe('Network error')
  })

  it('should handle non-Error exceptions', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce('String error')

    const result = await searchTickers(TEST_QUERY_AAPL)

    expect(result.status).toBe(HTTP_STATUS_INTERNAL_ERROR)
    expect(result.error).toBe('Failed to search tickers')
    expect(result.details).toBe('Unknown error')
  })

  it('should return empty array for no results', async () => {
    const mockResponse = createMockYahooSearchResponse({
      symbols: [],
    })

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockFetchResponse(mockResponse) as Response
    )

    const result = await searchTickers('NOTFOUND')

    expect(result.status).toBe(HTTP_STATUS_OK)
    expect(result.data).toEqual([])
  })
})

describe('tickerSearchCache', () => {
  beforeEach(() => {
    tickerSearchCache.clear()
  })

  it('should cache and retrieve results', () => {
    const results: TickerSearchResult[] = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        type: 'Equity',
      },
    ]

    tickerSearchCache.set('AAPL', results)
    const cached = tickerSearchCache.get('AAPL')

    expect(cached).toEqual(results)
  })

  it('should normalize queries for cache keys', () => {
    const results: TickerSearchResult[] = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
      },
    ]

    tickerSearchCache.set('AAPL', results)

    // Should retrieve with different cases and whitespace
    expect(tickerSearchCache.get('aapl')).toEqual(results)
    expect(tickerSearchCache.get(' AAPL ')).toEqual(results)
    expect(tickerSearchCache.get('AaPl')).toEqual(results)
  })

  it('should return null for missing entries', () => {
    const cached = tickerSearchCache.get('NOTFOUND')
    expect(cached).toBeNull()
  })

  it('should clear all entries', () => {
    tickerSearchCache.set('AAPL', [{ symbol: 'AAPL', name: 'Apple Inc.' }])
    tickerSearchCache.set('MSFT', [{ symbol: 'MSFT', name: 'Microsoft' }])

    tickerSearchCache.clear()

    expect(tickerSearchCache.get('AAPL')).toBeNull()
    expect(tickerSearchCache.get('MSFT')).toBeNull()
  })
})
