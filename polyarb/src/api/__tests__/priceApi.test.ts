/**
 * Tests for PolymarketClient - Price API and Configuration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PolymarketClient } from '../polymarketClient.js'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('PolymarketClient - Configuration', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should use default base URLs', () => {
    const client = new PolymarketClient()
    expect(client.getClobBaseUrl()).toBe('https://clob.polymarket.com')
    expect(client.getGammaBaseUrl()).toBe('https://gamma-api.polymarket.com')
  })

  it('should accept custom base URLs', () => {
    const client = new PolymarketClient({
      clobBaseUrl: 'https://custom-clob.example.com',
      gammaBaseUrl: 'https://custom-gamma.example.com',
    })
    expect(client.getClobBaseUrl()).toBe('https://custom-clob.example.com')
    expect(client.getGammaBaseUrl()).toBe('https://custom-gamma.example.com')
  })
})

describe('PolymarketClient - Price API', () => {
  let client: PolymarketClient

  beforeEach(() => {
    client = new PolymarketClient()
    mockFetch.mockReset()
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
})
