import { describe, it, expect } from 'vitest'
import {
  calculateStockGiftValue,
  formatCurrency,
  isValidDate,
  isValidTicker,
} from '../calculations'

// Test constants for calculations
const PRICE_HIGH_100 = 100
const PRICE_LOW_90 = 90
const SHARES_10 = 10
const EXPECTED_VALUE_950 = 950.0

const BRK_B_HIGH = 500.16
const BRK_B_LOW = 493.35
const BRK_B_SHARES = 34
const BRK_B_EXPECTED_VALUE = 16889.67

const PRICE_HIGH_123_456 = 123.456
const PRICE_LOW_123_444 = 123.444
const SHARES_100 = 100
const EXPECTED_VALUE_12345 = 12345.0

const PRICE_HIGH_10_004 = 10.004
const PRICE_LOW_10_002 = 10.002
const EXPECTED_VALUE_1000_3 = 1000.3

const PRICE_HIGH_10_006 = 10.006
const PRICE_LOW_10_004 = 10.004
const EXPECTED_VALUE_1000_5 = 1000.5

const PRICE_HIGH_150_5 = 150.5
const PRICE_LOW_149_5 = 149.5
const SHARES_1 = 1
const EXPECTED_VALUE_150 = 150.0

const PRICE_HIGH_1000 = 1000
const PRICE_LOW_900 = 900
const SHARES_10000 = 10000
const EXPECTED_VALUE_9500000 = 9500000.0

const SHARES_10_5 = 10.5
const EXPECTED_VALUE_997_5 = 997.5

const CURRENCY_1234_56 = 1234.56
const FORMATTED_1234_56 = '$1,234.56'

const CURRENCY_1234567_89 = 1234567.89
const FORMATTED_1234567_89 = '$1,234,567.89'

const CURRENCY_0_99 = 0.99
const FORMATTED_0_99 = '$0.99'

const CURRENCY_100_5 = 100.5
const FORMATTED_100_50 = '$100.50'

const YEARS_OFFSET_FUTURE = 1

describe('calculateStockGiftValue', () => {
  it('should calculate basic stock gift value', () => {
    const result = calculateStockGiftValue(
      PRICE_HIGH_100,
      PRICE_LOW_90,
      SHARES_10
    )
    expect(result).toBe(EXPECTED_VALUE_950)
  })

  it('should calculate BRK-B test case correctly', () => {
    const result = calculateStockGiftValue(BRK_B_HIGH, BRK_B_LOW, BRK_B_SHARES)
    expect(result).toBe(BRK_B_EXPECTED_VALUE)
  })

  it('should maintain fractional cents precision', () => {
    const result = calculateStockGiftValue(
      PRICE_HIGH_123_456,
      PRICE_LOW_123_444,
      SHARES_100
    )
    expect(result).toBe(EXPECTED_VALUE_12345)
  })

  it('should round to cents correctly', () => {
    const result1 = calculateStockGiftValue(
      PRICE_HIGH_10_004,
      PRICE_LOW_10_002,
      SHARES_100
    )
    expect(result1).toBe(EXPECTED_VALUE_1000_3)

    const result2 = calculateStockGiftValue(
      PRICE_HIGH_10_006,
      PRICE_LOW_10_004,
      SHARES_100
    )
    expect(result2).toBe(EXPECTED_VALUE_1000_5)
  })

  it('should handle single share correctly', () => {
    const result = calculateStockGiftValue(
      PRICE_HIGH_150_5,
      PRICE_LOW_149_5,
      SHARES_1
    )
    expect(result).toBe(EXPECTED_VALUE_150)
  })

  it('should handle large numbers', () => {
    const result = calculateStockGiftValue(
      PRICE_HIGH_1000,
      PRICE_LOW_900,
      SHARES_10000
    )
    expect(result).toBe(EXPECTED_VALUE_9500000)
  })

  it('should handle fractional shares', () => {
    const result = calculateStockGiftValue(
      PRICE_HIGH_100,
      PRICE_LOW_90,
      SHARES_10_5
    )
    expect(result).toBe(EXPECTED_VALUE_997_5)
  })
})

describe('formatCurrency', () => {
  it('should format currency with dollar sign and commas', () => {
    expect(formatCurrency(CURRENCY_1234_56)).toBe(FORMATTED_1234_56)
  })

  it('should format large numbers correctly', () => {
    expect(formatCurrency(CURRENCY_1234567_89)).toBe(FORMATTED_1234567_89)
  })

  it('should format small numbers correctly', () => {
    expect(formatCurrency(CURRENCY_0_99)).toBe(FORMATTED_0_99)
  })

  it('should always show two decimal places', () => {
    expect(formatCurrency(SHARES_100)).toBe('$100.00')
    expect(formatCurrency(CURRENCY_100_5)).toBe(FORMATTED_100_50)
  })
})

describe('isValidDate', () => {
  it('should accept valid dates in the past', () => {
    expect(isValidDate('2024-01-01')).toBe(true)
  })

  it('should accept today', () => {
    const today = new Date().toISOString().split('T')[0]
    if (!today) {
      throw new Error('Failed to get today date')
    }
    expect(isValidDate(today)).toBe(true)
  })

  it('should reject future dates', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + YEARS_OFFSET_FUTURE)
    const futureDate = future.toISOString().split('T')[0]
    if (!futureDate) {
      throw new Error('Failed to get future date')
    }
    expect(isValidDate(futureDate)).toBe(false)
  })

  it('should reject invalid date strings', () => {
    expect(isValidDate('invalid')).toBe(false)
    expect(isValidDate('2024-13-01')).toBe(false)
  })

  it('should reject empty strings', () => {
    expect(isValidDate('')).toBe(false)
  })
})

describe('isValidTicker', () => {
  it('should accept valid ticker symbols', () => {
    expect(isValidTicker('AAPL')).toBe(true)
    expect(isValidTicker('MSFT')).toBe(true)
    expect(isValidTicker('GOOG')).toBe(true)
  })

  it('should accept ticker symbols with dots or hyphens', () => {
    expect(isValidTicker('BRK-B')).toBe(true)
    expect(isValidTicker('BRK.A')).toBe(true)
  })

  it('should accept lowercase and convert to uppercase', () => {
    expect(isValidTicker('aapl')).toBe(true)
  })

  it('should reject invalid ticker symbols', () => {
    expect(isValidTicker('')).toBe(false)
    expect(isValidTicker('A')).toBe(true)
    expect(isValidTicker('TOOLONG')).toBe(false)
    expect(isValidTicker('12345')).toBe(false)
    expect(isValidTicker('A-BBB')).toBe(false) // Suffix too long (3 letters)
  })
})
