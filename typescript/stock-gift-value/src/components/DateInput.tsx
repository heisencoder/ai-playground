import { useState, useEffect, type KeyboardEvent } from 'react'

interface DateInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  inputRef?: (el: HTMLInputElement | null) => void
  className?: string
  hasError?: boolean
}

/**
 * Helper function to parse date with a specific delimiter (/, -)
 */
function parseDelimitedDate(input: string, delimiter: string): string | null {
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
 * Parse short date format (MM/DD or MM-DD) and return ISO date with current year
 */
function parseShortDate(input: string, delimiter: string): string | null {
  const escapedDelimiter = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^(\\d{1,2})${escapedDelimiter}(\\d{1,2})$`)
  const match = input.match(regex)

  if (match && match[1] && match[2]) {
    const currentYear = new Date().getFullYear()
    const month = match[1].padStart(2, '0')
    const day = match[2].padStart(2, '0')
    return `${currentYear}-${month}-${day}`
  }

  return null
}

/**
 * Parse ISO format with slashes (YYYY/MM/DD)
 */
function parseIsoSlashFormat(input: string): string | null {
  const match = input.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (match && match[1] && match[2] && match[3]) {
    return `${match[1]}-${match[2]}-${match[3]}`
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

  // Try MM/DD or M/D (no year) - default to current year
  const shortSlashResult = parseShortDate(input, '/')
  if (shortSlashResult) {
    return shortSlashResult
  }

  // Try MM-DD or M-D (no year) - default to current year
  const shortDashResult = parseShortDate(input, '-')
  if (shortDashResult) {
    return shortDashResult
  }

  // Try YYYY/MM/DD
  const isoSlashResult = parseIsoSlashFormat(input)
  if (isoSlashResult) {
    return isoSlashResult
  }

  // Fallback to Date constructor
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
 * Format ISO date (YYYY-MM-DD) for display in locale format (MM/DD/YYYY)
 */
function formatDateForDisplay(isoDate: string): string {
  if (!isoDate || !isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return isoDate
  }

  const [year, month, day] = isoDate.split('-')
  return `${month}/${day}/${year}`
}

export function DateInput({
  id,
  value,
  onChange,
  onBlur,
  onKeyDown,
  inputRef,
  className = '',
  hasError = false,
}: DateInputProps): React.JSX.Element {
  const [displayValue, setDisplayValue] = useState(() =>
    formatDateForDisplay(value)
  )

  // Update display value when value prop changes from parent
  useEffect(() => {
    setDisplayValue(formatDateForDisplay(value))
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.value
    setDisplayValue(newValue)
  }

  const handleInputBlur = (): void => {
    const parsedDate = parseDate(displayValue)
    onChange(parsedDate)
    setDisplayValue(formatDateForDisplay(parsedDate))
    onBlur()
  }

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      value={displayValue}
      onChange={handleInputChange}
      onBlur={handleInputBlur}
      onKeyDown={onKeyDown}
      className={`${className} ${hasError ? 'date-input-error' : ''}`}
      placeholder="MM/DD/YYYY"
      aria-label="Date"
    />
  )
}
