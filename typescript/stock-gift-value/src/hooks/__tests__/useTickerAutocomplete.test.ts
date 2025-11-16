import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTickerAutocomplete } from '../useTickerAutocomplete'
import { server } from '../../test/mocks/server'

describe('useTickerAutocomplete', () => {
  beforeEach(() => {
    server.listen()
  })

  afterEach(() => {
    server.resetHandlers()
    server.close()
    vi.restoreAllMocks()
  })

  it('should initialize with empty state', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    expect(result.current.suggestions).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.showSuggestions).toBe(false)
    expect(result.current.selectedIndex).toBe(-1)
  })

  it('should provide search function', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    expect(typeof result.current.searchTickers).toBe('function')
  })

  it('should provide selectSuggestion function', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Create a mock suggestion
    const mockSuggestion = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      exchange: 'NASDAQ',
      type: 'Equity',
    }

    act(() => {
      result.current.selectSuggestion(mockSuggestion)
    })

    expect(onSelect).toHaveBeenCalledWith('AAPL')
  })

  it('should provide keyboard navigation function', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    expect(typeof result.current.handleKeyboardNavigation).toBe('function')

    // Test that it doesn't throw
    act(() => {
      result.current.handleKeyboardNavigation('ArrowDown')
    })
  })

  it('should hide suggestions', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // First set showSuggestions to true
    act(() => {
      result.current.setShowSuggestions(true)
    })
    expect(result.current.showSuggestions).toBe(true)

    // Then hide them
    act(() => {
      result.current.hideSuggestions()
    })

    expect(result.current.showSuggestions).toBe(false)
    expect(result.current.selectedIndex).toBe(-1)
  })

  it('should reset selection', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Manually set selected index (simulating keyboard navigation)
    act(() => {
      result.current.handleKeyboardNavigation('ArrowDown')
    })

    // Reset selection
    act(() => {
      result.current.resetSelection()
    })

    expect(result.current.selectedIndex).toBe(-1)
  })

  it('should toggle showSuggestions', () => {
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

  it('should clear suggestions and hide on empty search', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Set some initial state
    act(() => {
      result.current.setShowSuggestions(true)
    })

    // Search with empty string
    act(() => {
      result.current.searchTickers('')
    })

    expect(result.current.suggestions).toEqual([])
    expect(result.current.showSuggestions).toBe(false)
  })

  it('should clear suggestions and hide on whitespace-only search', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Search with whitespace
    act(() => {
      result.current.searchTickers('   ')
    })

    expect(result.current.suggestions).toEqual([])
    expect(result.current.showSuggestions).toBe(false)
  })

  it('should handle ArrowUp when no item is selected', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Initially no selection
    expect(result.current.selectedIndex).toBe(-1)

    // ArrowUp with no selection should keep it at -1
    act(() => {
      result.current.handleKeyboardNavigation('ArrowUp')
    })

    expect(result.current.selectedIndex).toBe(-1)
  })

  it('should return false for keyboard navigation when no suggestions', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // No suggestions, keyboard navigation should return false
    let handled: boolean = true
    act(() => {
      handled = result.current.handleKeyboardNavigation('ArrowDown')
    })
    expect(handled).toBe(false)

    act(() => {
      handled = result.current.handleKeyboardNavigation('ArrowUp')
    })
    expect(handled).toBe(false)

    act(() => {
      handled = result.current.handleKeyboardNavigation('Enter')
    })
    expect(handled).toBe(false)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('should return false for unhandled keys', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    let handled: boolean = false
    act(() => {
      handled = result.current.handleKeyboardNavigation('Tab')
    })

    expect(handled).toBe(false)
  })
})
