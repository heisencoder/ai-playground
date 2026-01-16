/**
 * Tests for PolymarketClient - Order Book API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PolymarketClient } from '../polymarketClient.js'
import type { OrderBookSummary } from '../../types/index.js'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('PolymarketClient - Order Book API', () => {
  let client: PolymarketClient

  beforeEach(() => {
    client = new PolymarketClient()
    mockFetch.mockReset()
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
})
