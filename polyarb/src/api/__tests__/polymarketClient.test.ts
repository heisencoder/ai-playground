import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PolymarketClient } from '../polymarketClient.js'
import type { OrderBookSummary, GammaMarket } from '../../types/index.js'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('PolymarketClient', () => {
  let client: PolymarketClient

  beforeEach(() => {
    client = new PolymarketClient()
    mockFetch.mockReset()
  })

  describe('constructor', () => {
    it('should use default base URLs', () => {
      expect(client.getClobBaseUrl()).toBe('https://clob.polymarket.com')
      expect(client.getGammaBaseUrl()).toBe('https://gamma-api.polymarket.com')
    })

    it('should accept custom base URLs', () => {
      const customClient = new PolymarketClient({
        clobBaseUrl: 'https://custom-clob.example.com',
        gammaBaseUrl: 'https://custom-gamma.example.com',
      })
      expect(customClient.getClobBaseUrl()).toBe(
        'https://custom-clob.example.com'
      )
      expect(customClient.getGammaBaseUrl()).toBe(
        'https://custom-gamma.example.com'
      )
    })
  })

  describe('getOrderBook', () => {
    const mockOrderBook: OrderBookSummary = {
      market: 'test-market',
      asset_id: 'token-123',
      timestamp: '2024-01-01T00:00:00Z',
      bids: [
        { price: '0.55', size: '100' },
        { price: '0.54', size: '200' },
      ],
      asks: [
        { price: '0.56', size: '150' },
        { price: '0.57', size: '250' },
      ],
      hash: 'abc123',
    }

    it('should fetch order book for a token ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOrderBook),
      })

      const result = await client.getOrderBook('token-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/book?token_id=token-123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(result).toEqual(mockOrderBook)
    })

    it('should throw error on failed fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(client.getOrderBook('invalid-token')).rejects.toThrow(
        'Failed to fetch order book: 404 Not Found'
      )
    })

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(client.getOrderBook('token-123')).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('getOrderBooks', () => {
    const mockOrderBook1: OrderBookSummary = {
      market: 'market-1',
      asset_id: 'token-1',
      timestamp: '2024-01-01T00:00:00Z',
      bids: [{ price: '0.50', size: '100' }],
      asks: [{ price: '0.51', size: '100' }],
      hash: 'hash1',
    }

    const mockOrderBook2: OrderBookSummary = {
      market: 'market-2',
      asset_id: 'token-2',
      timestamp: '2024-01-01T00:00:00Z',
      bids: [{ price: '0.30', size: '100' }],
      asks: [{ price: '0.31', size: '100' }],
      hash: 'hash2',
    }

    it('should fetch multiple order books in parallel', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOrderBook1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOrderBook2),
        })

      const result = await client.getOrderBooks(['token-1', 'token-2'])

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.get('token-1')).toEqual(mockOrderBook1)
      expect(result.get('token-2')).toEqual(mockOrderBook2)
    })

    it('should handle partial failures gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOrderBook1),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })

      const result = await client.getOrderBooks(['token-1', 'token-2'])

      expect(result.get('token-1')).toEqual(mockOrderBook1)
      expect(result.has('token-2')).toBe(false)
    })
  })

  describe('getMarkets', () => {
    const mockMarkets: GammaMarket[] = [
      {
        id: 1,
        question: 'Test Market 1',
        slug: 'test-market-1',
        conditionId: 'cond-1',
        active: true,
        closed: false,
        createdAt: '2024-01-01T00:00:00Z',
        tokens: [
          { token_id: 'token-yes-1', outcome: 'Yes', price: 0.5 },
          { token_id: 'token-no-1', outcome: 'No', price: 0.5 },
        ],
      },
      {
        id: 2,
        question: 'Test Market 2',
        slug: 'test-market-2',
        conditionId: 'cond-2',
        active: true,
        closed: false,
        createdAt: '2024-01-01T00:00:00Z',
        tokens: [
          { token_id: 'token-yes-2', outcome: 'Yes', price: 0.7 },
          { token_id: 'token-no-2', outcome: 'No', price: 0.3 },
        ],
      },
    ]

    it('should fetch all markets', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMarkets),
      })

      const result = await client.getMarkets()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/markets',
        expect.objectContaining({
          method: 'GET',
        })
      )
      expect(result).toEqual(mockMarkets)
    })

    it('should fetch markets with query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMarkets),
      })

      await client.getMarkets({ active: true, closed: false, limit: 10 })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=10',
        expect.any(Object)
      )
    })
  })

  describe('getMarketBySlug', () => {
    const mockMarket: GammaMarket = {
      id: 1,
      question: 'Who will win the Super Bowl?',
      slug: 'super-bowl-winner',
      conditionId: 'cond-1',
      active: true,
      closed: false,
      createdAt: '2024-01-01T00:00:00Z',
      tokens: [
        { token_id: 'token-chiefs', outcome: 'Chiefs', price: 0.25 },
        { token_id: 'token-eagles', outcome: 'Eagles', price: 0.2 },
      ],
    }

    it('should fetch market by slug', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMarket),
      })

      const result = await client.getMarketBySlug('super-bowl-winner')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/markets/slug/super-bowl-winner',
        expect.any(Object)
      )
      expect(result).toEqual(mockMarket)
    })

    it('should return null for non-existent market', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await client.getMarketBySlug('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getMidpoint', () => {
    it('should fetch midpoint price for a token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ mid: '0.55' }),
      })

      const result = await client.getMidpoint('token-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/midpoint?token_id=token-123',
        expect.any(Object)
      )
      expect(result).toBe(0.55)
    })
  })

  describe('getSpread', () => {
    it('should fetch spread for a token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ spread: '0.02' }),
      })

      const result = await client.getSpread('token-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/spread?token_id=token-123',
        expect.any(Object)
      )
      expect(result).toBe(0.02)
    })
  })

  describe('searchMarkets', () => {
    const mockSearchResults: GammaMarket[] = [
      {
        id: 1,
        question: 'Super Bowl 2025 Winner',
        slug: 'super-bowl-2025',
        conditionId: 'cond-1',
        active: true,
        closed: false,
        createdAt: '2024-01-01T00:00:00Z',
        tokens: [],
      },
    ]

    it('should search markets by query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResults),
      })

      const result = await client.searchMarkets('Super Bowl')

      // URLSearchParams uses + for spaces
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/markets?_q=Super+Bowl',
        expect.any(Object)
      )
      expect(result).toEqual(mockSearchResults)
    })
  })
})
