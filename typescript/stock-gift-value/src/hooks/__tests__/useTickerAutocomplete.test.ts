/* eslint-disable max-lines-per-function -- Test file with multiple test cases */
/* eslint-disable max-nested-callbacks -- Tests require nested structure */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTickerAutocomplete } from '../useTickerAutocomplete'
import { server } from '../../test/mocks/server'

const DEBOUNCE_DELAY_MS = 300
const ADVANCE_TIMER_MS_SHORT = 100
const SUGGESTIONS_TIMEOUT_MS = 2000

describe('useTickerAutocomplete', () => {
  beforeEach(() => {
    server.listen()
    vi.useFakeTimers()
  })

  afterEach(() => {
    server.resetHandlers()
    server.close()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should initialize with empty state', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    expect(result.current.suggestions).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.showSuggestions).toBe(false)
    expect(result.current.selectedIndex).toBe(-1)
  })

  it('should search for tickers and return results', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Trigger search
    act(() => {
      void result.current.searchTickers('AAPL')
    })

    // Advance timer to trigger debounced search
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS)
    })

    // Wait for results
    await waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    expect(result.current.suggestions[0].symbol).toBe('AAPL')
    expect(result.current.suggestions[0].name).toBe('Apple Inc.')
    expect(result.current.showSuggestions).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  it('should debounce search requests', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Trigger multiple searches quickly
    act(() => {
      void result.current.searchTickers('A')
    })
    act(() => {
      vi.advanceTimersByTime(ADVANCE_TIMER_MS_SHORT)
    })
    act(() => {
      void result.current.searchTickers('AA')
    })
    act(() => {
      vi.advanceTimersByTime(ADVANCE_TIMER_MS_SHORT)
    })
    act(() => {
      void result.current.searchTickers('AAP')
    })

    // Only advance to trigger the last search
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS)
    })

    await waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    // Should have results for the last query
    expect(result.current.suggestions[0].symbol).toBe('AAPL')
  })

  it('should clear suggestions for empty query', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // First search with results
    act(() => {
      void result.current.searchTickers('AAPL')
    })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS)
    })

    await waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    // Clear with empty query
    act(() => {
      void result.current.searchTickers('')
    })

    expect(result.current.suggestions).toEqual([])
    expect(result.current.showSuggestions).toBe(false)
  })

  it('should select suggestion and call onSelect', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Manually set suggestions for testing
    act(() => {
      void result.current.searchTickers('AAPL')
    })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS)
    })

    void waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    ).then(() => {
      const suggestion = result.current.suggestions[0]

      act(() => {
        result.current.selectSuggestion(suggestion)
      })

      expect(onSelect).toHaveBeenCalledWith('AAPL')
      expect(result.current.suggestions).toEqual([])
      expect(result.current.showSuggestions).toBe(false)
      expect(result.current.selectedIndex).toBe(-1)
    })
  })

  it('should handle keyboard navigation - ArrowDown', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    act(() => {
      void result.current.searchTickers('GOOG')
    })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS)
    })

    await waitFor(
      () => {
        expect(result.current.suggestions.length).toBe(2)
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    // Navigate down
    act(() => {
      result.current.handleKeyboardNavigation('ArrowDown')
    })
    expect(result.current.selectedIndex).toBe(0)

    act(() => {
      result.current.handleKeyboardNavigation('ArrowDown')
    })
    expect(result.current.selectedIndex).toBe(1)

    // Should not go beyond last item
    act(() => {
      result.current.handleKeyboardNavigation('ArrowDown')
    })
    expect(result.current.selectedIndex).toBe(1)
  })

  it('should handle keyboard navigation - ArrowUp', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    act(() => {
      void result.current.searchTickers('GOOG')
    })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS)
    })

    await waitFor(
      () => {
        expect(result.current.suggestions.length).toBe(2)
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    // Navigate to last item first
    act(() => {
      result.current.handleKeyboardNavigation('ArrowDown')
      result.current.handleKeyboardNavigation('ArrowDown')
    })
    expect(result.current.selectedIndex).toBe(1)

    // Navigate up
    act(() => {
      result.current.handleKeyboardNavigation('ArrowUp')
    })
    expect(result.current.selectedIndex).toBe(0)

    act(() => {
      result.current.handleKeyboardNavigation('ArrowUp')
    })
    expect(result.current.selectedIndex).toBe(-1)
  })

  it('should handle keyboard navigation - Enter', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    act(() => {
      void result.current.searchTickers('AAPL')
    })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS)
    })

    await waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    // Select first item
    act(() => {
      result.current.handleKeyboardNavigation('ArrowDown')
    })

    // Press Enter
    act(() => {
      const handled = result.current.handleKeyboardNavigation('Enter')
      expect(handled).toBe(true)
    })

    expect(onSelect).toHaveBeenCalledWith('AAPL')
    expect(result.current.showSuggestions).toBe(false)
  })

  it('should handle keyboard navigation - Escape', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    act(() => {
      void result.current.searchTickers('AAPL')
    })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS)
    })

    await waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    expect(result.current.showSuggestions).toBe(true)

    // Press Escape
    act(() => {
      const handled = result.current.handleKeyboardNavigation('Escape')
      expect(handled).toBe(true)
    })

    expect(result.current.showSuggestions).toBe(false)
    expect(result.current.selectedIndex).toBe(-1)
  })

  it('should hide suggestions', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    act(() => {
      void result.current.searchTickers('AAPL')
    })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS)
    })

    await waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    expect(result.current.showSuggestions).toBe(true)

    act(() => {
      result.current.hideSuggestions()
    })

    expect(result.current.showSuggestions).toBe(false)
    expect(result.current.selectedIndex).toBe(-1)
  })

  it('should reset selection', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    act(() => {
      void result.current.searchTickers('GOOG')
    })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_DELAY_MS)
    })

    void waitFor(
      () => {
        expect(result.current.suggestions.length).toBe(2)
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    ).then(() => {
      // Set selection
      act(() => {
        result.current.handleKeyboardNavigation('ArrowDown')
      })
      expect(result.current.selectedIndex).toBe(0)

      // Reset
      act(() => {
        result.current.resetSelection()
      })
      expect(result.current.selectedIndex).toBe(-1)
    })
  })

  it('should show suggestions when showSuggestions is set', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    expect(result.current.showSuggestions).toBe(false)

    act(() => {
      result.current.setShowSuggestions(true)
    })

    expect(result.current.showSuggestions).toBe(true)

    act(() => {
      result.current.setShowSuggestions(false)
    })

    expect(result.current.showSuggestions).toBe(false)
  })
})
