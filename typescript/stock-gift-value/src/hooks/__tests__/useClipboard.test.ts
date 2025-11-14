import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClipboard } from '../useClipboard'
import { StockGift } from '../../types'

describe('useClipboard', () => {
  const isRowEmpty = (gift: StockGift): boolean => {
    return !gift.date && !gift.ticker && !gift.shares
  }

  beforeEach(() => {
    vi.useFakeTimers()
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should handle successful copy with value', async () => {
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

    // Test that message clears after timeout
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.copyMessage).toBe('')
  })

  it('should handle copy with loading state', async () => {
    const { result } = renderHook(() => useClipboard(isRowEmpty))

    const gifts: StockGift[] = [
      {
        id: '1',
        date: '2024-01-01',
        ticker: 'AAPL',
        shares: 10,
        loading: true,
      },
    ]

    await act(async () => {
      await result.current.handleCopy(gifts)
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>
    const callArg = writeText.mock.calls[0]?.[0] as string
    expect(callArg).toContain('Loading...')
  })

  it('should handle copy with error state', async () => {
    const { result } = renderHook(() => useClipboard(isRowEmpty))

    const gifts: StockGift[] = [
      {
        id: '1',
        date: '2024-01-01',
        ticker: 'AAPL',
        shares: 10,
        error: 'Invalid ticker',
      },
    ]

    await act(async () => {
      await result.current.handleCopy(gifts)
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>
    const callArg = writeText.mock.calls[0]?.[0] as string
    expect(callArg).toContain('Error')
  })

  it('should handle copy with no value', async () => {
    const { result } = renderHook(() => useClipboard(isRowEmpty))

    const gifts: StockGift[] = [
      {
        id: '1',
        date: '2024-01-01',
        ticker: 'AAPL',
        shares: 10,
        // No value, loading, or error
      },
    ]

    await act(async () => {
      await result.current.handleCopy(gifts)
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>
    const callArg = writeText.mock.calls[0]?.[0] as string
    // Should have empty value field (ends with tab or newline)
    expect(callArg).toMatch(/AAPL\t10\t\s*$/)
  })

  it('should exclude empty rows from copy', async () => {
    const { result } = renderHook(() => useClipboard(isRowEmpty))

    const gifts: StockGift[] = [
      {
        id: '1',
        date: '2024-01-01',
        ticker: 'AAPL',
        shares: 10,
        value: 1500,
      },
      {
        id: '2',
        date: '',
        ticker: '',
        shares: 0, // Empty row
      },
    ]

    await act(async () => {
      await result.current.handleCopy(gifts)
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>
    const callArg = writeText.mock.calls[0]?.[0] as string
    const lines = callArg.split('\n')
    // Should only have header + 1 data row (empty row excluded)
    expect(lines.length).toBe(2)
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

    // Test that error message clears after timeout
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.copyMessage).toBe('')
  })
})
