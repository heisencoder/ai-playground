import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import './DateInput.css'

// Constants
const CALENDAR_SHOW_DELAY_MS = 500

interface DateInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  inputRef?: (el: HTMLInputElement | null) => void
  className?: string
  maxDate?: string
}

/**
 * Helper function to parse date with a specific delimiter (/, -)
 */
function parseDelimitedDate(
  input: string,
  delimiter: string
): string | null {
  const escapedDelimiter = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(
    `^(\\d{1,2})${escapedDelimiter}(\\d{1,2})${escapedDelimiter}(\\d{4})$`
  )
  const match = input.match(regex)

  if (match && match[1] && match[2] && match[3]) {
    const month = match[1].padStart(2, '0')
    const day = match[2].padStart(2, '0')
    const year = match[3]
    return `${year}-${month}-${day}`
  }

  return null
}

/**
 * Parse various date formats and return ISO date string (YYYY-MM-DD)
 */
function parseDate(input: string): string {
  if (!input.trim()) {
    return ''
  }

  // Already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input
  }

  // Try MM/DD/YYYY or M/D/YYYY with slash
  const slashResult = parseDelimitedDate(input, '/')
  if (slashResult) {
    return slashResult
  }

  // Try MM-DD-YYYY or M-D-YYYY with dash
  const dashResult = parseDelimitedDate(input, '-')
  if (dashResult) {
    return dashResult
  }

  // YYYY/MM/DD
  const isoSlashMatch = input.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (
    isoSlashMatch &&
    isoSlashMatch[1] &&
    isoSlashMatch[2] &&
    isoSlashMatch[3]
  ) {
    return `${isoSlashMatch[1]}-${isoSlashMatch[2]}-${isoSlashMatch[3]}`
  }

  // Try to parse with Date constructor as fallback
  try {
    const date = new Date(input)
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  } catch {
    // Invalid date, return original
  }

  return input
}

/**
 * Format ISO date (YYYY-MM-DD) for display
 * When not focused, keep ISO format for compatibility
 * When focused, show user-friendly format
 */
function formatDateForDisplay(isoDate: string, isFocused: boolean): string {
  if (!isoDate || !isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return isoDate
  }

  // Keep ISO format when not focused for test compatibility
  if (!isFocused) {
    return isoDate
  }

  const [year, month, day] = isoDate.split('-')
  return `${month}/${day}/${year}`
}

/* eslint-disable max-lines-per-function -- Component requires multiple handlers and state management */
export function DateInput({
  id,
  value,
  onChange,
  onBlur,
  onKeyDown,
  inputRef,
  className = '',
  maxDate,
}: DateInputProps): React.JSX.Element {
  const [focused, setFocused] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [displayValue, setDisplayValue] = useState(() =>
    formatDateForDisplay(value, false)
  )
  const calendarInputRef = useRef<HTMLInputElement>(null)
  const showCalendarTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update display value when value prop changes
  useEffect(() => {
    if (!focused) {
      setDisplayValue(formatDateForDisplay(value, false))
    }
  }, [value, focused])

  // Helper to clear calendar timeout
  const clearCalendarTimeout = (): void => {
    if (showCalendarTimeoutRef.current) {
      clearTimeout(showCalendarTimeoutRef.current)
      showCalendarTimeoutRef.current = null
    }
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      clearCalendarTimeout()
    }
  }, [])

  const handleTextInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const newValue = e.target.value
    setDisplayValue(newValue)
  }

  const handleTextInputBlur = (): void => {
    const parsedDate = parseDate(displayValue)
    onChange(parsedDate)
    setDisplayValue(formatDateForDisplay(parsedDate, false))
    setFocused(false)
    setShowCalendar(false)
    clearCalendarTimeout()
    onBlur()
  }

  const handleTextInputFocus = (): void => {
    setFocused(true)
    setDisplayValue(formatDateForDisplay(value, true))
    // Delay showing calendar to avoid interfering with tab navigation
    showCalendarTimeoutRef.current = setTimeout(() => {
      setShowCalendar(true)
    }, CALENDAR_SHOW_DELAY_MS)
  }

  const handleCalendarChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const newValue = e.target.value
    onChange(newValue)
    setDisplayValue(formatDateForDisplay(newValue, focused))
  }

  const handleCalendarClick = (): void => {
    if (calendarInputRef.current) {
      calendarInputRef.current.showPicker()
    }
  }

  return (
    <div className="date-input-container">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={displayValue}
        onChange={handleTextInputChange}
        onBlur={handleTextInputBlur}
        onFocus={handleTextInputFocus}
        onKeyDown={onKeyDown}
        className={className}
        placeholder="YYYY-MM-DD"
        aria-label="Date"
      />
      {showCalendar && (
        <div className="date-calendar-dropdown">
          <input
            ref={calendarInputRef}
            type="date"
            value={value}
            onChange={handleCalendarChange}
            max={maxDate}
            className="date-calendar-input"
            aria-label="Calendar picker"
          />
          <button
            type="button"
            onClick={handleCalendarClick}
            className="date-calendar-button"
            tabIndex={-1}
          >
            📅
          </button>
        </div>
      )}
    </div>
  )
}
