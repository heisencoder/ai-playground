import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchStockPrice, mockFetchStockPrice } from '../stockApi'
import { stockPriceCache } from '../cache'

describe('stockApi', () => {
  beforeEach(() => {
    // Clear cache before each test
    stockPriceCache.clear()
    // Clear all fetch mocks
    vi.restoreAllMocks()
  })

  describe('mockFetchStockPrice', () => {
    it('should return mock data', () => {
      const result = mockFetchStockPrice('AAPL', '2024-01-01', 150, 145)
      expect(result).toEqual({
        date: '2024-01-01',
        high: 150,
        low: 145,
        ticker: 'AAPL',
      })
    })

    it('should store data in cache', () => {
      mockFetchStockPrice('AAPL', '2024-01-01', 150, 145)
      const cached = stockPriceCache.get('AAPL', '2024-01-01')
      expect(cached).toBeTruthy()
      expect(cached?.high).toBe(150)
      expect(cached?.low).toBe(145)
    })

    it('should normalize ticker to uppercase', () => {
      const result = mockFetchStockPrice('aapl', '2024-01-01', 150, 145)
      expect(result.ticker).toBe('AAPL')
    })
  })

  describe('fetchStockPrice', () => {
    it('should return cached data if available', async () => {
      // First, mock some data
      mockFetchStockPrice('AAPL', '2024-01-01', 150, 145)

      // Now fetch should return cached data without hitting API
      const result = await fetchStockPrice('AAPL', '2024-01-01')
      expect(result).toEqual({
        date: '2024-01-01',
        high: 150,
        low: 145,
        ticker: 'AAPL',
      })
    })

    it('should normalize ticker to uppercase', async () => {
      mockFetchStockPrice('aapl', '2024-01-01', 150, 145)
      const result = await fetchStockPrice('aapl', '2024-01-01')
      expect(result.ticker).toBe('AAPL')
    })

    it('should fetch from API if not cached', async () => {
      // Mock the global fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          chart: {
            result: [
              {
                indicators: {
                  quote: [
                    {
                      high: [150],
                      low: [145],
                    },
                  ],
                },
              },
            ],
          },
        }),
      })

      const result = await fetchStockPrice('AAPL', '2024-01-01')
      expect(result.high).toBe(150)
      expect(result.low).toBe(145)
      expect(result.ticker).toBe('AAPL')
    })

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })

      await expect(fetchStockPrice('INVALID', '2024-01-01')).rejects.toThrow()
    })

    it('should handle missing data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
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
        }),
      })

      await expect(fetchStockPrice('AAPL', '2024-01-01')).rejects.toThrow(
        /No trading data available/
      )
    })
  })
})
