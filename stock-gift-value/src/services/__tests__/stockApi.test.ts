import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fetchStockPrice } from '../stockApi'
import { stockPriceCache } from '../cache'
import { server } from '../../test/mocks/server'

// Test constants
const TEST_TICKER_AAPL = 'AAPL'
const TEST_DATE = '2024-01-01'
const PRICE_HIGH_150 = 150
const PRICE_LOW_140 = 140

const BRK_B_TICKER = 'BRK-B'
const BRK_B_DATE = '2025-11-07'
const BRK_B_HIGH = 500.16
const BRK_B_LOW = 493.35

const HTTP_STATUS_INTERNAL_ERROR = 500

const networkErrorHandler = http.get('*/api/stock-price', () => {
  return HttpResponse.json(
    { error: 'Network error' },
    { status: HTTP_STATUS_INTERNAL_ERROR }
  )
})

const malformedResponseHandler = http.get('*/api/stock-price', () => {
  return new Response('Internal Server Error', {
    status: HTTP_STATUS_INTERNAL_ERROR,
    headers: { 'Content-Type': 'text/plain' },
  })
})

describe('stockApi', () => {
  beforeEach(() => {
    stockPriceCache.clear()
  })

  describe('fetchStockPrice', () => {
    it('should return cached data if available', async () => {
      const result1 = await fetchStockPrice(TEST_TICKER_AAPL, TEST_DATE)
      expect(result1).toEqual({
        date: TEST_DATE,
        high: PRICE_HIGH_150,
        low: PRICE_LOW_140,
        ticker: TEST_TICKER_AAPL,
      })

      const result2 = await fetchStockPrice(TEST_TICKER_AAPL, TEST_DATE)
      expect(result2).toEqual({
        date: TEST_DATE,
        high: PRICE_HIGH_150,
        low: PRICE_LOW_140,
        ticker: TEST_TICKER_AAPL,
      })
    })

    it('should normalize ticker to uppercase', async () => {
      const result = await fetchStockPrice('aapl', TEST_DATE)
      expect(result.ticker).toBe(TEST_TICKER_AAPL)
    })

    it('should fetch from API if not cached', async () => {
      const result = await fetchStockPrice(TEST_TICKER_AAPL, TEST_DATE)
      expect(result.high).toBe(PRICE_HIGH_150)
      expect(result.low).toBe(PRICE_LOW_140)
      expect(result.ticker).toBe(TEST_TICKER_AAPL)
    })

    it('should handle API errors gracefully', async () => {
      await expect(fetchStockPrice('INVALID123', TEST_DATE)).rejects.toThrow(
        /Invalid ticker/
      )
    })

    it('should handle BRK.B ticker correctly', async () => {
      const result = await fetchStockPrice(BRK_B_TICKER, BRK_B_DATE)
      expect(result).toEqual({
        date: BRK_B_DATE,
        high: BRK_B_HIGH,
        low: BRK_B_LOW,
        ticker: BRK_B_TICKER,
      })
    })

    it('should cache results after fetching', async () => {
      await fetchStockPrice(TEST_TICKER_AAPL, TEST_DATE)

      const cached = stockPriceCache.get(TEST_TICKER_AAPL, TEST_DATE)
      expect(cached).toBeTruthy()
      expect(cached?.high).toBe(PRICE_HIGH_150)
      expect(cached?.low).toBe(PRICE_LOW_140)
    })

    it('should handle network errors', async () => {
      server.use(networkErrorHandler)
      await expect(
        fetchStockPrice(TEST_TICKER_AAPL, TEST_DATE)
      ).rejects.toThrow()
    })

    it('should handle malformed JSON in error response', async () => {
      server.use(malformedResponseHandler)
      await expect(
        fetchStockPrice(TEST_TICKER_AAPL, TEST_DATE)
      ).rejects.toThrow(/Unknown error/)
    })
  })
})
