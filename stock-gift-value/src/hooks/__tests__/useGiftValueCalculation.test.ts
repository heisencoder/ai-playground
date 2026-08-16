import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse, delay } from 'msw'
import { useGiftValueCalculation } from '../useGiftValueCalculation'
import { server } from '../../test/mocks/server'
import { stockPriceCache } from '../../services/cache'
import { StockGift } from '../../types'

const RESPONSE_DELAY_MS = 50
// Comfortably past the response delay so a late write would have landed.
const POST_UNMOUNT_SETTLE_MS = 200

/**
 * Build a gift with all fields required to trigger a price fetch.
 */
function makeGift(overrides: Partial<StockGift> = {}): StockGift {
  return {
    id: 'gift-1',
    date: '2024-01-15',
    ticker: 'AAPL',
    shares: 100,
    ...overrides,
  }
}

describe('useGiftValueCalculation', () => {
  beforeEach(() => {
    // Cached prices short-circuit the fetch, so start each test cold.
    stockPriceCache.clear()
  })

  it('should fetch and store the calculated value for a complete gift', async () => {
    const updateGift = vi.fn()
    const gift = makeGift()

    renderHook(() => useGiftValueCalculation([gift], updateGift))

    await waitFor(() => {
      expect(updateGift).toHaveBeenCalledWith(
        'gift-1',
        expect.objectContaining({
          // (15 + 14) / 2 * 100 shares
          value: 1450,
          loading: false,
          highPrice: 15,
          lowPrice: 14,
        })
      )
    })
  })

  it('should flag an invalid date without fetching', async () => {
    const updateGift = vi.fn()
    const gift = makeGift({ date: 'not-a-date' })

    renderHook(() => useGiftValueCalculation([gift], updateGift))

    await waitFor(() => {
      expect(updateGift).toHaveBeenCalledWith(
        'gift-1',
        expect.objectContaining({ error: 'Invalid date', value: undefined })
      )
    })
    expect(updateGift).not.toHaveBeenCalledWith(
      'gift-1',
      expect.objectContaining({ loading: true })
    )
  })

  it('should flag an invalid ticker without fetching', async () => {
    const updateGift = vi.fn()
    const gift = makeGift({ ticker: '123!@#' })

    renderHook(() => useGiftValueCalculation([gift], updateGift))

    await waitFor(() => {
      expect(updateGift).toHaveBeenCalledWith(
        'gift-1',
        expect.objectContaining({ error: 'Invalid ticker', value: undefined })
      )
    })
    expect(updateGift).not.toHaveBeenCalledWith(
      'gift-1',
      expect.objectContaining({ loading: true })
    )
  })

  it('should surface a fetch failure as an error on the gift', async () => {
    server.use(
      http.get('*/api/stock-price', () =>
        HttpResponse.json({ error: 'Ticker not found' }, { status: 404 })
      )
    )
    const updateGift = vi.fn()
    const gift = makeGift({ ticker: 'NOPE' })

    renderHook(() => useGiftValueCalculation([gift], updateGift))

    await waitFor(() => {
      expect(updateGift).toHaveBeenCalledWith(
        'gift-1',
        expect.objectContaining({
          error: expect.stringContaining('Ticker not found') as string,
          loading: false,
          value: undefined,
        })
      )
    })
  })

  it('should not update a gift after the hook has unmounted', async () => {
    // Hold the response open so the fetch is still in flight at unmount time.
    server.use(
      http.get('*/api/stock-price', async () => {
        await delay(RESPONSE_DELAY_MS)
        return HttpResponse.json({
          date: '2024-01-15',
          high: 15,
          low: 14,
          ticker: 'AAPL',
        })
      })
    )

    const updateGift = vi.fn()
    const gift = makeGift()

    const { unmount } = renderHook(() =>
      useGiftValueCalculation([gift], updateGift)
    )

    // The effect starts the fetch and flips `loading` on synchronously.
    await waitFor(() => {
      expect(updateGift).toHaveBeenCalledWith(
        'gift-1',
        expect.objectContaining({ loading: true })
      )
    })

    unmount()
    const callsAtUnmount = updateGift.mock.calls.length

    // Give the in-flight request time to resolve after unmount.
    await new Promise((resolve) => setTimeout(resolve, POST_UNMOUNT_SETTLE_MS))

    // Writing state here would be a React "update ... not wrapped in act(...)"
    // warning in tests and a memory leak in the browser.
    expect(updateGift.mock.calls.length).toBe(callsAtUnmount)
  })
})
