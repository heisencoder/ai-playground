import { describe, it, expect } from 'vitest'
import {
  calculateStockGiftValue,
  formatCurrency,
  isValidDate,
  isValidTicker,
  getFMVCalculationDetails,
  roundHalfUp,
  isPennyStock,
} from '../calculations'
import {
  standardStockTestCases,
  pennyStockTestCases,
  allTestCases,
  roundingTestCases,
  pennyStockDetectionCases,
  currencyFormatCases,
} from './testData'

// Precision constants for toBeCloseTo - describe the precision level, not the value
const PRECISION_FULL = 10
const PRECISION_PENNY_STOCK_PRICE = 4
const PRECISION_PENNY_STOCK_AVERAGE = 5

describe('roundHalfUp', () => {
  it.each(roundingTestCases)(
    '$description',
    ({ value, decimals, expected }) => {
      expect(roundHalfUp(value, decimals)).toBe(expected)
    }
  )
})

describe('isPennyStock', () => {
  it.each(pennyStockDetectionCases)('$description', ({ price, expected }) => {
    expect(isPennyStock(price)).toBe(expected)
  })
})

describe('calculateStockGiftValue', () => {
  describe('standard stocks', () => {
    it.each(standardStockTestCases)(
      '$name: should return $expected.finalValue',
      ({ input, expected }) => {
        const result = calculateStockGiftValue(
          input.high,
          input.low,
          input.shares
        )
        expect(result).toBe(expected.finalValue)
      }
    )
  })

  describe('penny stocks', () => {
    it.each(pennyStockTestCases)(
      '$name: should return $expected.finalValue',
      ({ input, expected }) => {
        const result = calculateStockGiftValue(
          input.high,
          input.low,
          input.shares
        )
        expect(result).toBe(expected.finalValue)
      }
    )
  })
})

describe('formatCurrency', () => {
  it.each(currencyFormatCases)('$description', ({ value, expected }) => {
    expect(formatCurrency(value)).toBe(expected)
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
    future.setFullYear(future.getFullYear() + 1)
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

describe('getFMVCalculationDetails', () => {
  describe('standard stocks', () => {
    it.each(standardStockTestCases)(
      '$name: should return correct calculation details',
      ({ input, expected }) => {
        const details = getFMVCalculationDetails(
          input.high,
          input.low,
          input.shares
        )

        expect(details.roundedHigh).toBe(expected.roundedHigh)
        expect(details.roundedLow).toBe(expected.roundedLow)
        expect(details.averagePrice).toBeCloseTo(
          expected.averagePrice,
          PRECISION_FULL
        )
        expect(details.finalValue).toBe(expected.finalValue)
        expect(details.isPennyStock).toBe(expected.isPennyStock)
        expect(details.priceDecimalPlaces).toBe(expected.priceDecimalPlaces)
        expect(details.averageDecimalPlaces).toBe(expected.averageDecimalPlaces)
      }
    )
  })

  describe('penny stocks', () => {
    it.each(pennyStockTestCases)(
      '$name: should return correct calculation details with higher precision',
      ({ input, expected }) => {
        const details = getFMVCalculationDetails(
          input.high,
          input.low,
          input.shares
        )

        expect(details.roundedHigh).toBeCloseTo(
          expected.roundedHigh,
          PRECISION_PENNY_STOCK_PRICE
        )
        expect(details.roundedLow).toBeCloseTo(
          expected.roundedLow,
          PRECISION_PENNY_STOCK_PRICE
        )
        expect(details.averagePrice).toBeCloseTo(
          expected.averagePrice,
          PRECISION_PENNY_STOCK_AVERAGE
        )
        expect(details.finalValue).toBe(expected.finalValue)
        expect(details.isPennyStock).toBe(expected.isPennyStock)
        expect(details.priceDecimalPlaces).toBe(expected.priceDecimalPlaces)
        expect(details.averageDecimalPlaces).toBe(expected.averageDecimalPlaces)
      }
    )
  })

  it('should match calculateStockGiftValue final result for all cases', () => {
    for (const { input } of allTestCases) {
      const details = getFMVCalculationDetails(
        input.high,
        input.low,
        input.shares
      )
      const calculatedValue = calculateStockGiftValue(
        input.high,
        input.low,
        input.shares
      )
      expect(details.finalValue).toBe(calculatedValue)
    }
  })
})
