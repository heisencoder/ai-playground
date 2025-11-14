import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fetchStockPrice } from '../stockApi'
import { stockPriceCache } from '../cache'
import { server } from '../../test/mocks/server'

describe('stockApi', () => {
  beforeEach(() => {
    // Clear cache before each test
    stockPriceCache.clear()
  })

  describe('fetchStockPrice', () => {
    it('should return cached data if available', async () => {
      // First call will fetch from API and cache
      const result1 = await fetchStockPrice('AAPL', '2024-01-01')
      expect(result1).toEqual({
        date: '2024-01-01',
        high: 150,
        low: 140,
        ticker: 'AAPL',
      })

      // Second call should return cached data
      const result2 = await fetchStockPrice('AAPL', '2024-01-01')
      expect(result2).toEqual({
        date: '2024-01-01',
        high: 150,
        low: 140,
        ticker: 'AAPL',
      })
    })

    it('should normalize ticker to uppercase', async () => {
      const result = await fetchStockPrice('aapl', '2024-01-01')
      expect(result.ticker).toBe('AAPL')
    })

    it('should fetch from API if not cached', async () => {
      const result = await fetchStockPrice('AAPL', '2024-01-01')
      expect(result.high).toBe(150)
      expect(result.low).toBe(140)
      expect(result.ticker).toBe('AAPL')
    })

    it('should handle API errors gracefully', async () => {
      await expect(fetchStockPrice('INVALID123', '2024-01-01')).rejects.toThrow(
        /Invalid ticker/
      )
    })

    it('should handle BRK.B ticker correctly', async () => {
      const result = await fetchStockPrice('BRK.B', '2025-11-07')
      expect(result).toEqual({
        date: '2025-11-07',
        high: 500.16,
        low: 493.35,
        ticker: 'BRK.B',
      })
    })

    it('should cache results after fetching', async () => {
      // Fetch from API
      await fetchStockPrice('AAPL', '2024-01-01')

      // Check that it's in cache
      const cached = stockPriceCache.get('AAPL', '2024-01-01')
      expect(cached).toBeTruthy()
      expect(cached?.high).toBe(150)
      expect(cached?.low).toBe(140)
    })

    it('should handle network errors', async () => {
      // Override the handler to simulate network error
      server.use(
        http.get('*/api/stock-price', () => {
          return HttpResponse.json({ error: 'Network error' }, { status: 500 })
        })
      )

      await expect(fetchStockPrice('AAPL', '2024-01-01')).rejects.toThrow()
    })

    it('should handle malformed JSON in error response', async () => {
      // Override the handler to return non-JSON error response
      server.use(
        http.get('*/api/stock-price', () => {
          return new Response('Internal Server Error', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
          })
        })
      )

      await expect(fetchStockPrice('AAPL', '2024-01-01')).rejects.toThrow(
        /Unknown error/
      )
    })
  })
})
