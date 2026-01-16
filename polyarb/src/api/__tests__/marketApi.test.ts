/**
 * Tests for PolymarketClient - Market API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PolymarketClient } from '../polymarketClient.js'
import type { GammaMarket } from '../../types/index.js'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('PolymarketClient - Market API', () => {
  let client: PolymarketClient

  beforeEach(() => {
    client = new PolymarketClient()
    mockFetch.mockReset()
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

    it('should fetch markets with offset parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMarkets),
      })

      await client.getMarkets({ offset: 20 })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/markets?offset=20',
        expect.any(Object)
      )
    })

    it('should throw error on Gamma API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(client.getMarkets()).rejects.toThrow(
        'Failed to fetch from Gamma API: 500 Internal Server Error'
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

    it('should throw error for non-404 failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(client.getMarketBySlug('some-market')).rejects.toThrow(
        'Failed to fetch market: 500 Internal Server Error'
      )
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
