import { describe, it, expect } from 'vitest'
import {
  calculateStockGiftValue,
  formatCurrency,
  isValidDate,
  isValidTicker,
} from '../calculations'

describe('calculateStockGiftValue', () => {
  it('should calculate basic stock gift value', () => {
    const result = calculateStockGiftValue(100, 90, 10)
    expect(result).toBe(950.0)
  })

  it('should calculate BRK.B test case correctly', () => {
    // Test case: Date: 11/7/2025, Ticker: BRK.B, Shares: 34, Expected: $16,889.67
    // Actual values for BRK.B on 11/7/2025: High=$500.16, Low=$493.35
    // Average: ($500.16 + $493.35) / 2 = $496.755
    const high = 500.16
    const low = 493.35
    const shares = 34
    const result = calculateStockGiftValue(high, low, shares)
    expect(result).toBe(16889.67)
  })

  it('should maintain fractional cents precision', () => {
    const result = calculateStockGiftValue(123.456, 123.444, 100)
    expect(result).toBe(12345.0)
  })

  it('should round to cents correctly', () => {
    // Test rounding down
    const result1 = calculateStockGiftValue(10.004, 10.002, 100)
    expect(result1).toBe(1000.3)

    // Test rounding up
    const result2 = calculateStockGiftValue(10.006, 10.004, 100)
    expect(result2).toBe(1000.5)
  })

  it('should handle single share correctly', () => {
    const result = calculateStockGiftValue(150.5, 149.5, 1)
    expect(result).toBe(150.0)
  })

  it('should handle large numbers', () => {
    const result = calculateStockGiftValue(1000, 900, 10000)
    expect(result).toBe(9500000.0)
  })

  it('should handle fractional shares', () => {
    const result = calculateStockGiftValue(100, 90, 10.5)
    expect(result).toBe(997.5)
  })
})

describe('formatCurrency', () => {
  it('should format currency with dollar sign and commas', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('should format large numbers correctly', () => {
    expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
  })

  it('should format small numbers correctly', () => {
    expect(formatCurrency(0.99)).toBe('$0.99')
  })

  it('should always show two decimal places', () => {
    expect(formatCurrency(100)).toBe('$100.00')
    expect(formatCurrency(100.5)).toBe('$100.50')
  })
})

describe('isValidDate', () => {
  it('should accept valid dates in the past', () => {
    expect(isValidDate('2024-01-01')).toBe(true)
  })

  it('should accept today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(isValidDate(today)).toBe(true)
  })

  it('should reject future dates', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    const futureDate = future.toISOString().split('T')[0]
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

  it('should accept ticker symbols with dots', () => {
    expect(isValidTicker('BRK.B')).toBe(true)
    expect(isValidTicker('BRK.A')).toBe(true)
  })

  it('should accept lowercase and convert to uppercase', () => {
    expect(isValidTicker('aapl')).toBe(true)
  })

  it('should reject invalid ticker symbols', () => {
    expect(isValidTicker('')).toBe(false)
    expect(isValidTicker('A')).toBe(true) // Single letter is valid
    expect(isValidTicker('TOOLONG')).toBe(false) // Too long
    expect(isValidTicker('12345')).toBe(false) // Numbers only
    expect(isValidTicker('AA-BB')).toBe(false) // Invalid character
  })
})
