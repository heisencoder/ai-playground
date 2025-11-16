/**
 * Validation utilities for API request parameters
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validate ticker parameter from request
 */
export function validateTicker(
  ticker: string | string[] | undefined
): ValidationResult {
  const tickerValue = Array.isArray(ticker) ? ticker[0] : ticker

  if (!tickerValue || typeof tickerValue !== 'string') {
    return {
      isValid: false,
      error: 'Ticker parameter is required',
    }
  }

  return { isValid: true }
}

/**
 * Validate date parameter from request
 */
export function validateDate(
  date: string | string[] | undefined
): ValidationResult {
  const dateValue = Array.isArray(date) ? date[0] : date

  if (!dateValue || typeof dateValue !== 'string') {
    return {
      isValid: false,
      error: 'Date parameter is required',
    }
  }

  return { isValid: true }
}

/**
 * Extract ticker value from request parameter
 */
export function extractTicker(ticker: string | string[] | undefined): string {
  return Array.isArray(ticker) ? ticker[0] : ticker ?? ''
}

/**
 * Extract date value from request parameter
 */
export function extractDate(date: string | string[] | undefined): string {
  return Array.isArray(date) ? date[0] : date ?? ''
}
