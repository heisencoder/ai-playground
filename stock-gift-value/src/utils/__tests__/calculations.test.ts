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
} from './testData'

// Constants for standalone tests
const YEARS_OFFSET_FUTURE = 1

// Rounding test constants
const ROUND_VALUE_2_5 = 2.5
const ROUND_VALUE_3_5 = 3.5
const ROUND_VALUE_4_5 = 4.5
const ROUND_EXPECTED_3 = 3
const ROUND_EXPECTED_4 = 4
const ROUND_EXPECTED_5 = 5
const ROUND_DECIMALS_0 = 0
const ROUND_DECIMALS_2 = 2
const ROUND_VALUE_1_125 = 1.125
const ROUND_VALUE_1_135 = 1.135
const ROUND_VALUE_1_145 = 1.145
const ROUND_EXPECTED_1_13 = 1.13
const ROUND_EXPECTED_1_14 = 1.14
const ROUND_EXPECTED_1_15 = 1.15

// Penny stock test constants
const PENNY_PRICE_0_99 = 0.99
const PENNY_PRICE_0_50 = 0.5
const PENNY_PRICE_0_01 = 0.01
const NON_PENNY_PRICE_1_00 = 1.0
const NON_PENNY_PRICE_1_01 = 1.01
const NON_PENNY_PRICE_100 = 100

// Currency format test constants
const CURRENCY_1234_56 = 1234.56
const CURRENCY_1234567_89 = 1234567.89
const CURRENCY_0_99 = 0.99
const CURRENCY_100 = 100
const CURRENCY_100_5 = 100.5

// Precision constants for toBeCloseTo
const PRECISION_10 = 10
const PRECISION_4 = 4
const PRECISION_5 = 5

// Expected decimal places
const EXPECTED_PRICE_DECIMALS_4 = 4
const EXPECTED_AVG_DECIMALS_5 = 5

// COWZ 12/16/2025 test case constants
const COWZ_DEC16_HIGH = 61.33700180053711
const COWZ_DEC16_LOW = 60.51499938964844
const COWZ_DEC16_SHARES = 53
const COWZ_DEC16_ROUNDED_HIGH = 61.34
const COWZ_DEC16_ROUNDED_LOW = 60.51
const COWZ_DEC16_AVERAGE = 60.925
const COWZ_DEC16_EXPECTED_VALUE = 3229.03

// PCLA penny stock test case constants
const PCLA_HIGH = 0.3070000112056732
const PCLA_LOW = 0.29499998688697815
const PCLA_SHARES = 1000
const PCLA_ROUNDED_HIGH = 0.307
const PCLA_ROUNDED_LOW = 0.295
const PCLA_AVERAGE = 0.301
const PCLA_EXPECTED_VALUE = 301.0

describe('roundHalfUp', () => {
  it.each(roundingTestCases)(
    '$description',
    ({ value, decimals, expected }) => {
      expect(roundHalfUp(value, decimals)).toBe(expected)
    }
  )

  it("should always round 0.5 up (unlike banker's rounding)", () => {
    // Banker's rounding would round 2.5 to 2, but we want 3
    expect(roundHalfUp(ROUND_VALUE_2_5, ROUND_DECIMALS_0)).toBe(
      ROUND_EXPECTED_3
    )
    expect(roundHalfUp(ROUND_VALUE_3_5, ROUND_DECIMALS_0)).toBe(
      ROUND_EXPECTED_4
    )
    expect(roundHalfUp(ROUND_VALUE_4_5, ROUND_DECIMALS_0)).toBe(
      ROUND_EXPECTED_5
    )

    // At 2 decimal places
    expect(roundHalfUp(ROUND_VALUE_1_125, ROUND_DECIMALS_2)).toBe(
      ROUND_EXPECTED_1_13
    )
    expect(roundHalfUp(ROUND_VALUE_1_135, ROUND_DECIMALS_2)).toBe(
      ROUND_EXPECTED_1_14
    )
    expect(roundHalfUp(ROUND_VALUE_1_145, ROUND_DECIMALS_2)).toBe(
      ROUND_EXPECTED_1_15
    )
  })
})

describe('isPennyStock', () => {
  it('should return true for prices under $1', () => {
    expect(isPennyStock(PENNY_PRICE_0_99)).toBe(true)
    expect(isPennyStock(PENNY_PRICE_0_50)).toBe(true)
    expect(isPennyStock(PENNY_PRICE_0_01)).toBe(true)
  })

  it('should return false for prices at or above $1', () => {
    expect(isPennyStock(NON_PENNY_PRICE_1_00)).toBe(false)
    expect(isPennyStock(NON_PENNY_PRICE_1_01)).toBe(false)
    expect(isPennyStock(NON_PENNY_PRICE_100)).toBe(false)
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
  it('should format currency with dollar sign and commas', () => {
    expect(formatCurrency(CURRENCY_1234_56)).toBe('$1,234.56')
  })

  it('should format large numbers correctly', () => {
    expect(formatCurrency(CURRENCY_1234567_89)).toBe('$1,234,567.89')
  })

  it('should format small numbers correctly', () => {
    expect(formatCurrency(CURRENCY_0_99)).toBe('$0.99')
  })

  it('should always show two decimal places', () => {
    expect(formatCurrency(CURRENCY_100)).toBe('$100.00')
    expect(formatCurrency(CURRENCY_100_5)).toBe('$100.50')
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
          PRECISION_10
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
          PRECISION_4
        )
        expect(details.roundedLow).toBeCloseTo(expected.roundedLow, PRECISION_4)
        expect(details.averagePrice).toBeCloseTo(
          expected.averagePrice,
          PRECISION_5
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

  it('COWZ 12/16/2025: should round half-cent UP to 3229.03', () => {
    // This is the specific edge case from the user's request
    // high: 61.33700180053711 -> 61.34
    // low: 60.51499938964844 -> 60.51
    // average: (61.34 + 60.51) / 2 = 60.925
    // total: 60.925 * 53 = 3229.025 -> rounds UP to 3229.03 (not 3229.02)
    const details = getFMVCalculationDetails(
      COWZ_DEC16_HIGH,
      COWZ_DEC16_LOW,
      COWZ_DEC16_SHARES
    )

    expect(details.roundedHigh).toBe(COWZ_DEC16_ROUNDED_HIGH)
    expect(details.roundedLow).toBe(COWZ_DEC16_ROUNDED_LOW)
    expect(details.averagePrice).toBe(COWZ_DEC16_AVERAGE)
    expect(details.finalValue).toBe(COWZ_DEC16_EXPECTED_VALUE)
  })

  it('PCLA penny stock: should use 4 decimal places for prices', () => {
    // high: 0.3070000112056732 -> 0.3070
    // low: 0.29499998688697815 -> 0.2950
    // average: 0.30100 (5 decimals)
    const details = getFMVCalculationDetails(PCLA_HIGH, PCLA_LOW, PCLA_SHARES)

    expect(details.isPennyStock).toBe(true)
    expect(details.priceDecimalPlaces).toBe(EXPECTED_PRICE_DECIMALS_4)
    expect(details.averageDecimalPlaces).toBe(EXPECTED_AVG_DECIMALS_5)
    expect(details.roundedHigh).toBeCloseTo(PCLA_ROUNDED_HIGH, PRECISION_4)
    expect(details.roundedLow).toBeCloseTo(PCLA_ROUNDED_LOW, PRECISION_4)
    expect(details.averagePrice).toBeCloseTo(PCLA_AVERAGE, PRECISION_5)
    expect(details.finalValue).toBe(PCLA_EXPECTED_VALUE)
  })
})
