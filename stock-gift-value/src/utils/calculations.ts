/**
 * Intermediate calculation values for FMV computation.
 * Used both for the final calculation and for displaying the breakdown.
 */
export interface FMVCalculationDetails {
  roundedHigh: number // High rounded to appropriate precision
  roundedLow: number // Low rounded to appropriate precision
  averagePrice: number // Average of rounded high and low
  totalBeforeRounding: number // averagePrice * shares (with extra decimal for display)
  finalValue: number // Final value rounded to cents
  isPennyStock: boolean // Whether this is a penny stock (trades under $1)
  priceDecimalPlaces: number // Number of decimal places for high/low display
  averageDecimalPlaces: number // Number of decimal places for average display
}

// Decimal place constants
const PENNY_STOCK_THRESHOLD = 1
const STANDARD_PRICE_DECIMALS = 2
const STANDARD_AVERAGE_DECIMALS = 3
const PENNY_STOCK_PRICE_DECIMALS = 4
const PENNY_STOCK_AVERAGE_DECIMALS = 5

// Rounding constants
const ROUNDING_HALF_BOUNDARY = 0.5
const FLOATING_POINT_TOLERANCE = 1e-9

/**
 * Round a number using "round half up" behavior.
 * Unlike Math.round() which uses banker's rounding (round half to even),
 * this always rounds 0.5 up to the next integer.
 *
 * Handles floating-point precision issues by using a small tolerance
 * when checking if the fractional part is at the 0.5 boundary.
 *
 * @param value - The value to round
 * @param decimals - Number of decimal places
 * @returns The rounded value
 */
export function roundHalfUp(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals)
  const scaled = value * multiplier
  // Check if fractional part is at or very close to 0.5 (within floating-point tolerance)
  // This handles cases like 60.924999999999997 which should be treated as 60.925
  const fraction = scaled % 1
  if (fraction >= ROUNDING_HALF_BOUNDARY - FLOATING_POINT_TOLERANCE) {
    return Math.ceil(scaled) / multiplier
  }
  return Math.floor(scaled) / multiplier
}

/**
 * Check if a stock is a penny stock (trades under $1).
 *
 * @param high - The high price on the donation date
 * @returns true if the stock is a penny stock
 */
export function isPennyStock(high: number): boolean {
  return high < PENNY_STOCK_THRESHOLD
}

/**
 * Get intermediate calculation values for FMV computation.
 * Returns values with specified precision to show the calculation breakdown.
 *
 * Per IRS guidelines, the value is the average of the high and low prices
 * on the date of the gift, multiplied by the number of shares.
 *
 * For standard stocks:
 * - High and low are rounded to 2 decimal places (nearest penny)
 * - Average is calculated with 3 decimal places (may have half-penny)
 *
 * For penny stocks (trading under $1):
 * - High and low are rounded to 4 decimal places
 * - Average is calculated with 5 decimal places
 *
 * The final value is always rounded to the nearest cent using "round half up"
 * behavior to ensure consistent rounding (0.5 always rounds up).
 *
 * @param high - The high price on the donation date
 * @param low - The low price on the donation date
 * @param shares - The number of shares donated
 * @returns Object containing all intermediate values and final result
 */
export function getFMVCalculationDetails(
  high: number,
  low: number,
  shares: number
): FMVCalculationDetails {
  // Determine if this is a penny stock
  const pennyStock = isPennyStock(high)

  // Set precision based on stock type
  const priceDecimals = pennyStock
    ? PENNY_STOCK_PRICE_DECIMALS
    : STANDARD_PRICE_DECIMALS
  const averageDecimals = pennyStock
    ? PENNY_STOCK_AVERAGE_DECIMALS
    : STANDARD_AVERAGE_DECIMALS

  // Round high and low to appropriate precision
  const roundedHigh = roundHalfUp(high, priceDecimals)
  const roundedLow = roundHalfUp(low, priceDecimals)

  // Calculate average price with appropriate precision
  const averagePrice = roundHalfUp(
    (roundedHigh + roundedLow) / 2,
    averageDecimals
  )

  // Calculate total value (keep one extra decimal for display)
  const totalBeforeRounding = roundHalfUp(
    averagePrice * shares,
    averageDecimals
  )

  // Round to cents (2 decimal places) using round half up
  const finalValue = roundHalfUp(averagePrice * shares, STANDARD_PRICE_DECIMALS)

  return {
    roundedHigh,
    roundedLow,
    averagePrice,
    totalBeforeRounding,
    finalValue,
    isPennyStock: pennyStock,
    priceDecimalPlaces: priceDecimals,
    averageDecimalPlaces: averageDecimals,
  }
}

/**
 * Calculate the IRS-approved value of a stock gift.
 * This is a convenience wrapper that returns just the final value.
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
  return getFMVCalculationDetails(high, low, shares).finalValue
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
