/**
 * Calculate the IRS-approved value of a stock gift.
 * Per IRS guidelines, the value is the average of the high and low prices
 * on the date of the gift, multiplied by the number of shares.
 *
 * The high and low prices are first rounded to the nearest penny before
 * computing the average. If the sum results in an odd number of pennies,
 * the average will have a half-penny (0.005) which is preserved in the
 * multiplication before final rounding.
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
  // Round high and low to nearest penny first
  const roundedHigh = Math.round(high * 100) / 100
  const roundedLow = Math.round(low * 100) / 100

  // Calculate average price (may have half-penny if sum is odd)
  const averagePrice = (roundedHigh + roundedLow) / 2

  // Calculate total value
  const totalValue = averagePrice * shares

  // Round to cents (2 decimal places)
  return Math.round(totalValue * 100) / 100
}

/**
 * Get intermediate calculation values for FMV info popup
 * Returns values with specified precision to show the calculation breakdown
 *
 * @param high - The high price on the donation date
 * @param low - The low price on the donation date
 * @param shares - The number of shares donated
 * @returns Object containing all intermediate values and final result
 */
export interface FMVCalculationDetails {
  roundedHigh: number // High rounded to nearest cent
  roundedLow: number // Low rounded to nearest cent
  averagePrice: number // Average of rounded high and low (may have half-cent)
  totalBeforeRounding: number // averagePrice * shares (3 decimal places)
  finalValue: number // Final value rounded to cents
}

export function getFMVCalculationDetails(
  high: number,
  low: number,
  shares: number
): FMVCalculationDetails {
  // Round high and low to nearest penny first
  const roundedHigh = Math.round(high * 100) / 100
  const roundedLow = Math.round(low * 100) / 100

  // Calculate average price (may have half-penny if sum is odd)
  const averagePrice = (roundedHigh + roundedLow) / 2

  // Calculate total value (keep 3 decimal places to show half-cent effect)
  const totalBeforeRounding = Math.round(averagePrice * shares * 1000) / 1000

  // Round to cents (2 decimal places)
  const finalValue = Math.round(averagePrice * shares * 100) / 100

  return {
    roundedHigh,
    roundedLow,
    averagePrice,
    totalBeforeRounding,
    finalValue,
  }
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

  // Basic validation: 1-5 uppercase letters, may contain dots or hyphens (e.g., BRK.B or BRK-B)
  const tickerRegex = /^[A-Z]{1,5}([.-][A-Z]{1,2})?$/
  return tickerRegex.test(ticker.toUpperCase())
}
