import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClipboard } from '../useClipboard'
import { StockGift } from '../../types'

describe('useClipboard', () => {
  const isRowEmpty = (gift: StockGift): boolean => {
    return !gift.date && !gift.ticker && !gift.shares
  }

  beforeEach(() => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    })
  })

  it('should handle successful copy', async () => {
    const { result } = renderHook(() => useClipboard(isRowEmpty))

    const gifts: StockGift[] = [
      {
        id: '1',
        date: '2024-01-01',
        ticker: 'AAPL',
        shares: 10,
        value: 1500,
      },
    ]

    await act(async () => {
      await result.current.handleCopy(gifts)
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    expect(result.current.copyMessage).toBe('Copied to clipboard!')
  })

  it('should handle copy failure', async () => {
    // Mock clipboard failure
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.reject(new Error('Failed'))),
      },
    })

    const { result } = renderHook(() => useClipboard(isRowEmpty))

    const gifts: StockGift[] = [
      {
        id: '1',
        date: '2024-01-01',
        ticker: 'AAPL',
        shares: 10,
      },
    ]

    await act(async () => {
      await result.current.handleCopy(gifts)
    })

    expect(result.current.copyMessage).toBe('Failed to copy')
  })
})
