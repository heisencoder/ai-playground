import { useEffect, useRef, type KeyboardEvent, type ChangeEvent } from 'react'
import {
  useTickerAutocomplete,
  type TickerSuggestion,
} from '../hooks/useTickerAutocomplete'
import './TickerAutocompleteInput.css'

interface TickerAutocompleteInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  inputRef?: (el: HTMLInputElement | null) => void
  className?: string
  placeholder?: string
  hasError?: boolean
}

/* eslint-disable max-lines-per-function -- Component requires multiple handlers */
export function TickerAutocompleteInput({
  id,
  value,
  onChange,
  onBlur,
  onKeyDown,
  inputRef,
  className = '',
  placeholder = 'AAPL',
  hasError = false,
}: TickerAutocompleteInputProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const {
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
    setFocused,
  } = useTickerAutocomplete((ticker: string) => {
    onChange(ticker)
  })

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        hideSuggestions()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [hideSuggestions])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.value
    onChange(newValue)
    void searchTickers(newValue)
  }

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    const handled = handleKeyboardNavigation(e.key)

    if (handled) {
      e.preventDefault()
      return
    }

    // Pass through other key events
    if (onKeyDown) {
      onKeyDown(e)
    }
  }

  const handleSuggestionMouseDown = (
    suggestion: TickerSuggestion
  ): void => {
    // Use mousedown instead of click to fire before blur
    selectSuggestion(suggestion)
  }

  const handleInputFocus = (): void => {
    setFocused(true)
    if (value.trim() && suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleInputBlur = (): void => {
    // Mark as not focused immediately
    setFocused(false)
    // Small delay to allow mousedown on suggestions to fire first
    setTimeout(() => {
      hideSuggestions()
      onBlur()
    }, 100)
  }

  const handleSuggestionMouseEnter = (): void => {
    resetSelection()
  }

  return (
    <div ref={containerRef} className="ticker-autocomplete-container">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        onKeyDown={handleInputKeyDown}
        className={`${className} ${hasError ? 'ticker-input-error' : ''}`}
        placeholder={placeholder}
        maxLength={10}
        aria-label="Ticker"
        aria-autocomplete="list"
        aria-controls={`${id}-suggestions`}
        aria-expanded={showSuggestions}
        autoComplete="off"
      />
      {showSuggestions && (
        <ul
          id={`${id}-suggestions`}
          className="ticker-suggestions"
          role="listbox"
        >
          {loading && (
            <li className="ticker-suggestion-loading">Searching...</li>
          )}
          {!loading && suggestions.length === 0 && value.trim() && (
            <li className="ticker-suggestion-empty">No results found</li>
          )}
          {!loading &&
            suggestions.map((suggestion, index) => (
              <li
                key={suggestion.symbol}
                className={`ticker-suggestion ${index === selectedIndex ? 'ticker-suggestion-selected' : ''}`}
                onMouseDown={() => handleSuggestionMouseDown(suggestion)}
                onMouseEnter={handleSuggestionMouseEnter}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <div className="ticker-suggestion-content">
                  <span className="ticker-suggestion-symbol">
                    {suggestion.symbol}
                  </span>
                  <span className="ticker-suggestion-name">
                    {suggestion.name}
                  </span>
                  {suggestion.exchange && (
                    <span className="ticker-suggestion-exchange">
                      {suggestion.exchange}
                    </span>
                  )}
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
