import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTickerAutocomplete } from '../useTickerAutocomplete'
import { server } from '../../test/mocks/server'

/* eslint-disable max-lines-per-function -- Test file with comprehensive test coverage */
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

  it('should hide suggestions when focus is lost', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Set focused and show suggestions
    act(() => {
      result.current.setFocused(true)
      result.current.setShowSuggestions(true)
    })

    expect(result.current.showSuggestions).toBe(true)

    // Lose focus
    act(() => {
      result.current.setFocused(false)
    })

    expect(result.current.showSuggestions).toBe(false)
  })

  it('should search and receive suggestions when focused', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Set focused first
    act(() => {
      result.current.setFocused(true)
    })

    // Trigger search
    act(() => {
      result.current.searchTickers('AAPL')
    })

    // Wait for debounce and fetch
    await vi.waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: 1000 }
    )

    expect(result.current.showSuggestions).toBe(true)
  })

  it('should navigate through suggestions with ArrowDown', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Set focused and trigger search (use 'goog' which returns 2 results)
    act(() => {
      result.current.setFocused(true)
      result.current.searchTickers('goog')
    })

    // Wait for suggestions to load (need 2+ suggestions for this test)
    await vi.waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(1)
      },
      { timeout: 1000 }
    )

    // Navigate down
    let handled: boolean = false
    act(() => {
      handled = result.current.handleKeyboardNavigation('ArrowDown')
    })

    expect(handled).toBe(true)
    expect(result.current.selectedIndex).toBe(0)

    // Navigate down again (need separate act for state to update)
    act(() => {
      result.current.handleKeyboardNavigation('ArrowDown')
    })

    expect(result.current.selectedIndex).toBe(1)
  })

  it('should navigate up with ArrowUp when item is selected', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Set focused and trigger search (use 'goog' which returns 2 results)
    act(() => {
      result.current.setFocused(true)
      result.current.searchTickers('goog')
    })

    // Wait for suggestions to load (need 2+ suggestions for this test)
    await vi.waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(1)
      },
      { timeout: 1000 }
    )

    // Navigate down to first item
    act(() => {
      result.current.handleKeyboardNavigation('ArrowDown')
    })

    // Navigate down to second item
    act(() => {
      result.current.handleKeyboardNavigation('ArrowDown')
    })

    expect(result.current.selectedIndex).toBe(1)

    // Navigate up
    let handled: boolean = false
    act(() => {
      handled = result.current.handleKeyboardNavigation('ArrowUp')
    })

    expect(handled).toBe(true)
    expect(result.current.selectedIndex).toBe(0)

    // Navigate up again should go to -1
    act(() => {
      result.current.handleKeyboardNavigation('ArrowUp')
    })

    expect(result.current.selectedIndex).toBe(-1)
  })

  it('should select suggestion with Enter key', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Set focused and trigger search
    act(() => {
      result.current.setFocused(true)
      result.current.searchTickers('AAPL')
    })

    // Wait for suggestions to load
    await vi.waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: 1000 }
    )

    // Navigate down to select first item
    act(() => {
      result.current.handleKeyboardNavigation('ArrowDown')
    })

    expect(result.current.selectedIndex).toBe(0)

    // Press Enter to select
    let handled: boolean = false
    act(() => {
      handled = result.current.handleKeyboardNavigation('Enter')
    })

    expect(handled).toBe(true)
    expect(onSelect).toHaveBeenCalledWith('AAPL')
    expect(result.current.showSuggestions).toBe(false)
  })

  it('should return false for Enter when no item is selected', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Set focused and trigger search
    act(() => {
      result.current.setFocused(true)
      result.current.searchTickers('AAPL')
    })

    // Wait for suggestions to load
    await vi.waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: 1000 }
    )

    // Press Enter without selecting an item (selectedIndex is -1)
    let handled: boolean = true
    act(() => {
      handled = result.current.handleKeyboardNavigation('Enter')
    })

    expect(handled).toBe(false)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('should hide suggestions with Escape key', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Set focused and trigger search
    act(() => {
      result.current.setFocused(true)
      result.current.searchTickers('AAPL')
    })

    // Wait for suggestions to load
    await vi.waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: 1000 }
    )

    expect(result.current.showSuggestions).toBe(true)

    // Press Escape
    let handled: boolean = false
    act(() => {
      handled = result.current.handleKeyboardNavigation('Escape')
    })

    expect(handled).toBe(true)
    expect(result.current.showSuggestions).toBe(false)
  })

  it('should hide suggestions with Tab key but return false', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Set focused and trigger search
    act(() => {
      result.current.setFocused(true)
      result.current.searchTickers('AAPL')
    })

    // Wait for suggestions to load
    await vi.waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: 1000 }
    )

    expect(result.current.showSuggestions).toBe(true)

    // Press Tab
    let handled: boolean = true
    act(() => {
      handled = result.current.handleKeyboardNavigation('Tab')
    })

    // Tab should return false (so default behavior continues)
    expect(handled).toBe(false)
    expect(result.current.showSuggestions).toBe(false)
  })

  it('should return false for unknown keys when suggestions are shown', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Set focused and trigger search
    act(() => {
      result.current.setFocused(true)
      result.current.searchTickers('AAPL')
    })

    // Wait for suggestions to load
    await vi.waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: 1000 }
    )

    // Press an unknown key
    let handled: boolean = true
    act(() => {
      handled = result.current.handleKeyboardNavigation('Space')
    })

    expect(handled).toBe(false)
  })

  it('should not go past last suggestion with ArrowDown', async () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTickerAutocomplete(onSelect))

    // Set focused and trigger search
    act(() => {
      result.current.setFocused(true)
      result.current.searchTickers('AAPL')
    })

    // Wait for suggestions to load
    await vi.waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      },
      { timeout: 1000 }
    )

    const lastIndex = result.current.suggestions.length - 1

    // Navigate to last item
    for (let i = 0; i <= lastIndex; i++) {
      act(() => {
        result.current.handleKeyboardNavigation('ArrowDown')
      })
    }

    expect(result.current.selectedIndex).toBe(lastIndex)

    // Try to go past last item
    act(() => {
      result.current.handleKeyboardNavigation('ArrowDown')
    })

    // Should stay at last index
    expect(result.current.selectedIndex).toBe(lastIndex)
  })
})
