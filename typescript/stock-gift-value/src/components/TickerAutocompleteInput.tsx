import { useEffect, useRef, type KeyboardEvent, type ChangeEvent } from 'react'
import {
  useTickerAutocomplete,
  type TickerSuggestion,
} from '../hooks/useTickerAutocomplete'
import './TickerAutocompleteInput.css'

const DROPDOWN_OFFSET_PX = 4
const MIN_DROPDOWN_HEIGHT_PX = 100
const VIEWPORT_BOTTOM_MARGIN_PX = 10
const MOBILE_BREAKPOINT_PX = 768
const MOBILE_DROPDOWN_WIDTH_MULTIPLIER = 2

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
  const inputElementRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLUListElement>(null)
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

  // Position dropdown using fixed positioning
  useEffect(() => {
    function updateDropdownPosition(): void {
      if (
        !showSuggestions ||
        !inputElementRef.current ||
        !dropdownRef.current
      ) {
        return
      }

      const inputRect = inputElementRef.current.getBoundingClientRect()
      const dropdown = dropdownRef.current

      // Position dropdown below input
      const topPosition = inputRect.bottom + DROPDOWN_OFFSET_PX
      dropdown.style.top = `${topPosition}px`
      dropdown.style.left = `${inputRect.left}px`

      // On mobile, make dropdown wider to show company names (span ticker + shares columns)
      const isMobile = window.innerWidth <= MOBILE_BREAKPOINT_PX
      const dropdownWidth = isMobile
        ? inputRect.width * MOBILE_DROPDOWN_WIDTH_MULTIPLIER
        : inputRect.width
      dropdown.style.width = `${dropdownWidth}px`

      // Limit max height to prevent extending below viewport
      const availableHeight = window.innerHeight - topPosition
      const maxHeight = Math.max(
        MIN_DROPDOWN_HEIGHT_PX,
        availableHeight - VIEWPORT_BOTTOM_MARGIN_PX
      )
      dropdown.style.maxHeight = `${maxHeight}px`
    }

    if (showSuggestions) {
      updateDropdownPosition()
      window.addEventListener('scroll', updateDropdownPosition, true)
      window.addEventListener('resize', updateDropdownPosition)
    }

    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true)
      window.removeEventListener('resize', updateDropdownPosition)
    }
  }, [showSuggestions])

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

  const handleSuggestionMouseDown = (suggestion: TickerSuggestion): void => {
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

  // Callback ref to set both internal and external refs
  const setInputRef = (el: HTMLInputElement | null): void => {
    inputElementRef.current = el
    if (inputRef) {
      inputRef(el)
    }
  }

  return (
    <div ref={containerRef} className="ticker-autocomplete-container">
      <input
        ref={setInputRef}
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
          ref={dropdownRef}
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
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
