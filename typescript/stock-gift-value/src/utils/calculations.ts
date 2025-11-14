/**
 * Calculate the IRS-approved value of a stock gift.
 * Per IRS guidelines, the value is the average of the high and low prices
 * on the date of the gift, multiplied by the number of shares.
 *
 * @param high - The high price on the donation date
 * @param low - The low price on the donation date
 * @param shares - The number of shares donated
 * @returns The calculated value rounded to cents (2 decimal places)
 */
export function calculateStockGiftValue(
  high: number,
  low: number,
  shares: number
): number {
  // Calculate average price maintaining precision
  const averagePrice = (high + low) / 2

  // Calculate total value
  const totalValue = averagePrice * shares

  // Round to cents (2 decimal places)
  return Math.round(totalValue * 100) / 100
}

/**
 * Format a value as USD currency
 *
 * @param value - The numeric value to format
 * @returns Formatted string like "$1,234.56"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Validate that a date is valid and not in the future
 *
 * @param dateString - ISO date string to validate
 * @returns true if valid, false otherwise
 */
export function isValidDate(dateString: string): boolean {
  if (!dateString) {
    return false
  }

  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return false
  }

  // Check if date is not in the future
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return date <= today
}

/**
 * Validate that a ticker symbol is reasonable
 *
 * @param ticker - The ticker symbol to validate
 * @returns true if valid format, false otherwise
 */
export function isValidTicker(ticker: string): boolean {
  if (!ticker) {
    return false
  }

  // Basic validation: 1-5 uppercase letters, may contain dots
  const tickerRegex = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/
  return tickerRegex.test(ticker.toUpperCase())
}
