/**
 * Formatting utilities for CLI output
 */

const PERCENTAGE_MULTIPLIER = 100
const DECIMAL_PLACES_PERCENT = 2
const DECIMAL_PLACES_PRICE = 3

/**
 * Format a number as a percentage string
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(DECIMAL_PLACES_PERCENT)}%`
}

/**
 * Format a number as a price string
 */
export function formatPrice(value: number): string {
  return value.toFixed(DECIMAL_PLACES_PRICE)
}

/**
 * Format a number as currency
 */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Convert a decimal probability to a percentage
 */
export function probabilityToPercent(probability: number): number {
  return probability * PERCENTAGE_MULTIPLIER
}
