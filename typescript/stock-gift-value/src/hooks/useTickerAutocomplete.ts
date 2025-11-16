import { useState, useCallback, useRef, useEffect } from 'react'

// Constants
const DEBOUNCE_DELAY_MS = 300

export interface TickerSuggestion {
  symbol: string
  name: string
  exchange?: string
  type?: string
}

interface UseTickerAutocompleteResult {
  suggestions: TickerSuggestion[]
  loading: boolean
  showSuggestions: boolean
  selectedIndex: number
  searchTickers: (query: string) => void
  selectSuggestion: (suggestion: TickerSuggestion) => void
  hideSuggestions: () => void
  setShowSuggestions: (show: boolean) => void
  handleKeyboardNavigation: (key: string) => boolean
  resetSelection: () => void
}

/**
 * Hook for managing ticker autocomplete functionality
 */
/* eslint-disable max-lines-per-function -- Hook manages complex state and multiple handlers */
export function useTickerAutocomplete(
  onSelect: (ticker: string) => void
): UseTickerAutocompleteResult {
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const abortControllerRef = useRef<AbortController | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const searchTickers = useCallback((query: string) => {
    const trimmedQuery = query.trim()

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Don't search if query is too short
    if (trimmedQuery.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Debounce the search
    searchTimeoutRef.current = setTimeout(() => {
      setLoading(true)
      abortControllerRef.current = new AbortController()

      fetch(`/api/ticker-search?q=${encodeURIComponent(trimmedQuery)}`, {
        signal: abortControllerRef.current.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to search tickers')
          }
          return response.json() as Promise<TickerSuggestion[]>
        })
        .then((data) => {
          setSuggestions(data)
          setShowSuggestions(data.length > 0)
          setSelectedIndex(-1)
        })
        .catch((error: Error) => {
          // Ignore abort errors
          if (error.name !== 'AbortError') {
            console.error('Error searching tickers:', error)
            setSuggestions([])
            setShowSuggestions(false)
          }
        })
        .finally(() => {
          setLoading(false)
        })
    }, DEBOUNCE_DELAY_MS)
  }, [])

  const selectSuggestion = useCallback(
    (suggestion: TickerSuggestion) => {
      onSelect(suggestion.symbol)
      setSuggestions([])
      setShowSuggestions(false)
      setSelectedIndex(-1)
    },
    [onSelect]
  )

  const hideSuggestions = useCallback(() => {
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }, [])

  const resetSelection = useCallback(() => {
    setSelectedIndex(-1)
  }, [])

  const handleKeyboardNavigation = useCallback(
    (key: string): boolean => {
      if (!showSuggestions || suggestions.length === 0) {
        return false
      }

      switch (key) {
        case 'ArrowDown':
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          )
          return true
        case 'ArrowUp':
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
          return true
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            const selectedSuggestion = suggestions[selectedIndex]
            if (selectedSuggestion) {
              selectSuggestion(selectedSuggestion)
              return true
            }
          }
          return false
        case 'Escape':
          hideSuggestions()
          return true
        case 'Tab':
          // Allow Tab to move to next field even when dropdown is open
          hideSuggestions()
          return false
        default:
          return false
      }
    },
    [
      showSuggestions,
      suggestions,
      selectedIndex,
      selectSuggestion,
      hideSuggestions,
    ]
  )

  return {
    suggestions,
    loading,
    showSuggestions,
    selectedIndex,
    searchTickers,
    selectSuggestion,
    hideSuggestions,
    setShowSuggestions,
    handleKeyboardNavigation,
    resetSelection,
  }
}
