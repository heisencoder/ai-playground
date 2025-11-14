import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClipboard } from '../useClipboard'
import { StockGift } from '../../types'

// Test constants
const TEST_TIMEOUT_MS = 2000
const TEST_SHARES = 10
const TEST_VALUE = 1500
const TEST_DATE = '2024-01-01'
const TEST_TICKER = 'AAPL'
const EXPECTED_LINE_COUNT_WITH_HEADER = 2

describe('useClipboard', () => {
  const isRowEmpty = (gift: StockGift): boolean => {
    return !gift.date && !gift.ticker && !gift.shares
  }

  const setupClipboardMock = (): void => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    })
  }

  const setupClipboardFailureMock = (): void => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.reject(new Error('Failed'))),
      },
    })
  }

  const getWriteTextMock = (): ReturnType<typeof vi.fn> => {
    return vi.mocked(navigator.clipboard.writeText)
  }

  const getFirstCallArg = (): string => {
    const mock = getWriteTextMock()
    const arg = mock.mock.calls[0]?.[0]
    if (typeof arg !== 'string') {
      throw new Error('Expected string argument')
    }
    return arg
  }

  beforeEach(() => {
    vi.useFakeTimers()
    setupClipboardMock()
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
        date: TEST_DATE,
        ticker: TEST_TICKER,
        shares: TEST_SHARES,
        value: TEST_VALUE,
      },
    ]

    await act(async () => {
      await result.current.handleCopy(gifts)
    })

    expect(getWriteTextMock()).toHaveBeenCalled()
    expect(result.current.copyMessage).toBe('Copied to clipboard!')

    act(() => {
      vi.advanceTimersByTime(TEST_TIMEOUT_MS)
    })

    expect(result.current.copyMessage).toBe('')
  })

  it('should handle copy with loading state', async () => {
    const { result } = renderHook(() => useClipboard(isRowEmpty))

    const gifts: StockGift[] = [
      {
        id: '1',
        date: TEST_DATE,
        ticker: TEST_TICKER,
        shares: TEST_SHARES,
        loading: true,
      },
    ]

    await act(async () => {
      await result.current.handleCopy(gifts)
    })

    const callArg = getFirstCallArg()
    expect(callArg).toContain('Loading...')
  })

  it('should handle copy with error state', async () => {
    const { result } = renderHook(() => useClipboard(isRowEmpty))

    const gifts: StockGift[] = [
      {
        id: '1',
        date: TEST_DATE,
        ticker: TEST_TICKER,
        shares: TEST_SHARES,
        error: 'Invalid ticker',
      },
    ]

    await act(async () => {
      await result.current.handleCopy(gifts)
    })

    const callArg = getFirstCallArg()
    expect(callArg).toContain('Error')
  })

  it('should handle copy with no value', async () => {
    const { result } = renderHook(() => useClipboard(isRowEmpty))

    const gifts: StockGift[] = [
      {
        id: '1',
        date: TEST_DATE,
        ticker: TEST_TICKER,
        shares: TEST_SHARES,
      },
    ]

    await act(async () => {
      await result.current.handleCopy(gifts)
    })

    const callArg = getFirstCallArg()
    expect(callArg).toMatch(/AAPL\t10\t\s*$/)
  })

  it('should exclude empty rows from copy', async () => {
    const { result } = renderHook(() => useClipboard(isRowEmpty))

    const gifts: StockGift[] = [
      {
        id: '1',
        date: TEST_DATE,
        ticker: TEST_TICKER,
        shares: TEST_SHARES,
        value: TEST_VALUE,
      },
      {
        id: '2',
        date: '',
        ticker: '',
        shares: 0,
      },
    ]

    await act(async () => {
      await result.current.handleCopy(gifts)
    })

    const callArg = getFirstCallArg()
    const lines = callArg.split('\n')
    expect(lines.length).toBe(EXPECTED_LINE_COUNT_WITH_HEADER)
  })

  it('should handle copy failure', async () => {
    setupClipboardFailureMock()
    const { result } = renderHook(() => useClipboard(isRowEmpty))

    const gifts: StockGift[] = [
      {
        id: '1',
        date: TEST_DATE,
        ticker: TEST_TICKER,
        shares: TEST_SHARES,
      },
    ]

    await act(async () => {
      await result.current.handleCopy(gifts)
    })

    expect(result.current.copyMessage).toBe('Failed to copy')

    act(() => {
      vi.advanceTimersByTime(TEST_TIMEOUT_MS)
    })

    expect(result.current.copyMessage).toBe('')
  })
})
