/**
 * Test data for FMV calculation tests.
 * Each test case includes raw Yahoo Finance API values and expected results.
 */

export interface FMVTestCase {
  name: string
  description: string
  input: {
    high: number
    low: number
    shares: number
    ticker: string
    date: string
  }
  expected: {
    roundedHigh: number
    roundedLow: number
    averagePrice: number
    finalValue: number
    isPennyStock: boolean
    priceDecimalPlaces: number
    averageDecimalPlaces: number
  }
}

/**
 * Standard stock test cases (prices >= $1)
 */
export const standardStockTestCases: FMVTestCase[] = [
  {
    name: 'Basic calculation',
    description: 'Simple round numbers for basic validation',
    input: {
      high: 100,
      low: 90,
      shares: 10,
      ticker: 'TEST',
      date: '2024-01-01',
    },
    expected: {
      roundedHigh: 100.0,
      roundedLow: 90.0,
      averagePrice: 95.0,
      finalValue: 950.0,
      isPennyStock: false,
      priceDecimalPlaces: 2,
      averageDecimalPlaces: 3,
    },
  },
  {
    name: 'BRK-B real-world case',
    description: 'Berkshire Hathaway B shares with typical prices',
    input: {
      high: 500.16,
      low: 493.35,
      shares: 34,
      ticker: 'BRK-B',
      date: '2024-12-01',
    },
    expected: {
      roundedHigh: 500.16,
      roundedLow: 493.35,
      averagePrice: 496.755,
      finalValue: 16889.67,
      isPennyStock: false,
      priceDecimalPlaces: 2,
      averageDecimalPlaces: 3,
    },
  },
  {
    name: 'COWZ original case - no half-cent issue',
    description: 'COWZ on a date where rounding does not produce half-cents',
    input: {
      high: 61.56999969482422,
      low: 61.13399887084961,
      shares: 53,
      ticker: 'COWZ',
      date: '2024-12-01',
    },
    expected: {
      roundedHigh: 61.57,
      roundedLow: 61.13,
      averagePrice: 61.35,
      finalValue: 3251.55,
      isPennyStock: false,
      priceDecimalPlaces: 2,
      averageDecimalPlaces: 3,
    },
  },
  {
    name: 'COWZ half-cent rounding case',
    description:
      'COWZ on 12/16/2025 - demonstrates half-cent rounding up behavior with odd shares',
    input: {
      high: 61.33700180053711,
      low: 60.51499938964844,
      shares: 53,
      ticker: 'COWZ',
      date: '2025-12-16',
    },
    expected: {
      // high: 61.337... rounds to 61.34
      // low: 60.515... rounds to 60.52 (round half up!)
      roundedHigh: 61.34,
      roundedLow: 60.51,
      // average: (61.34 + 60.51) / 2 = 60.925
      averagePrice: 60.925,
      // total: 60.925 * 53 = 3229.025 -> rounds UP to 3229.03
      finalValue: 3229.03,
      isPennyStock: false,
      priceDecimalPlaces: 2,
      averageDecimalPlaces: 3,
    },
  },
  {
    name: 'Half-penny effect - odd sum',
    description: 'When high + low has odd pennies, average has half-penny',
    input: {
      high: 10.006,
      low: 10.004,
      shares: 100,
      ticker: 'TEST',
      date: '2024-01-01',
    },
    expected: {
      // 10.006 rounds to 10.01, 10.004 rounds to 10.00
      roundedHigh: 10.01,
      roundedLow: 10.0,
      // average: (10.01 + 10.00) / 2 = 10.005
      averagePrice: 10.005,
      // total: 10.005 * 100 = 1000.5
      finalValue: 1000.5,
      isPennyStock: false,
      priceDecimalPlaces: 2,
      averageDecimalPlaces: 3,
    },
  },
  {
    name: 'Single share',
    description: 'Calculation with single share',
    input: {
      high: 150.5,
      low: 149.5,
      shares: 1,
      ticker: 'TEST',
      date: '2024-01-01',
    },
    expected: {
      roundedHigh: 150.5,
      roundedLow: 149.5,
      averagePrice: 150.0,
      finalValue: 150.0,
      isPennyStock: false,
      priceDecimalPlaces: 2,
      averageDecimalPlaces: 3,
    },
  },
  {
    name: 'Large numbers',
    description: 'Calculation with large share count',
    input: {
      high: 1000,
      low: 900,
      shares: 10000,
      ticker: 'TEST',
      date: '2024-01-01',
    },
    expected: {
      roundedHigh: 1000.0,
      roundedLow: 900.0,
      averagePrice: 950.0,
      finalValue: 9500000.0,
      isPennyStock: false,
      priceDecimalPlaces: 2,
      averageDecimalPlaces: 3,
    },
  },
  {
    name: 'Fractional shares',
    description: 'Calculation with fractional share count',
    input: {
      high: 100,
      low: 90,
      shares: 10.5,
      ticker: 'TEST',
      date: '2024-01-01',
    },
    expected: {
      roundedHigh: 100.0,
      roundedLow: 90.0,
      averagePrice: 95.0,
      finalValue: 997.5,
      isPennyStock: false,
      priceDecimalPlaces: 2,
      averageDecimalPlaces: 3,
    },
  },
  {
    name: 'Precision rounding - both round down',
    description: 'Both high and low round down',
    input: {
      high: 10.004,
      low: 10.002,
      shares: 100,
      ticker: 'TEST',
      date: '2024-01-01',
    },
    expected: {
      roundedHigh: 10.0,
      roundedLow: 10.0,
      averagePrice: 10.0,
      finalValue: 1000.0,
      isPennyStock: false,
      priceDecimalPlaces: 2,
      averageDecimalPlaces: 3,
    },
  },
  {
    name: 'Precision rounding - fractional cents preserved',
    description: 'Fractional cents in raw values round correctly',
    input: {
      high: 123.456,
      low: 123.444,
      shares: 100,
      ticker: 'TEST',
      date: '2024-01-01',
    },
    expected: {
      // 123.456 rounds to 123.46, 123.444 rounds to 123.44
      roundedHigh: 123.46,
      roundedLow: 123.44,
      // average: (123.46 + 123.44) / 2 = 123.45
      averagePrice: 123.45,
      // total: 123.45 * 100 = 12345
      finalValue: 12345.0,
      isPennyStock: false,
      priceDecimalPlaces: 2,
      averageDecimalPlaces: 3,
    },
  },
]

/**
 * Penny stock test cases (prices < $1)
 * These use higher precision: 4 decimal places for prices, 5 for average
 */
export const pennyStockTestCases: FMVTestCase[] = [
  {
    name: 'PCLA penny stock case',
    description:
      'PCLA on Nov 13, 2025 - demonstrates penny stock precision handling',
    input: {
      high: 0.3070000112056732,
      low: 0.29499998688697815,
      shares: 1000,
      ticker: 'PCLA',
      date: '2025-11-13',
    },
    expected: {
      // high: 0.3070... rounds to 0.3070 (4 decimals)
      // low: 0.2950... rounds to 0.2950 (4 decimals)
      roundedHigh: 0.307,
      roundedLow: 0.295,
      // average: (0.3070 + 0.2950) / 2 = 0.30100 (5 decimals)
      averagePrice: 0.301,
      // total: 0.30100 * 1000 = 301.00
      finalValue: 301.0,
      isPennyStock: true,
      priceDecimalPlaces: 4,
      averageDecimalPlaces: 5,
    },
  },
  {
    name: 'Very low penny stock',
    description: 'Stock trading at fractions of a penny',
    input: {
      high: 0.0125,
      low: 0.0115,
      shares: 10000,
      ticker: 'MICRO',
      date: '2024-01-01',
    },
    expected: {
      roundedHigh: 0.0125,
      roundedLow: 0.0115,
      // average: (0.0125 + 0.0115) / 2 = 0.01200
      averagePrice: 0.012,
      // total: 0.01200 * 10000 = 120.00
      finalValue: 120.0,
      isPennyStock: true,
      priceDecimalPlaces: 4,
      averageDecimalPlaces: 5,
    },
  },
  {
    name: 'Penny stock near threshold',
    description: 'Stock trading just under $1',
    input: {
      high: 0.9999,
      low: 0.9501,
      shares: 100,
      ticker: 'ALMOST',
      date: '2024-01-01',
    },
    expected: {
      roundedHigh: 0.9999,
      roundedLow: 0.9501,
      // average: (0.9999 + 0.9501) / 2 = 0.97500
      averagePrice: 0.975,
      // total: 0.97500 * 100 = 97.50
      finalValue: 97.5,
      isPennyStock: true,
      priceDecimalPlaces: 4,
      averageDecimalPlaces: 5,
    },
  },
]

/**
 * All test cases combined
 */
export const allTestCases: FMVTestCase[] = [
  ...standardStockTestCases,
  ...pennyStockTestCases,
]

/**
 * Round half up test cases - specific tests for the rounding function
 */
export interface RoundingTestCase {
  value: number
  decimals: number
  expected: number
  description: string
}

export const roundingTestCases: RoundingTestCase[] = [
  { value: 1.5, decimals: 0, expected: 2, description: '1.5 rounds up to 2' },
  { value: 2.5, decimals: 0, expected: 3, description: '2.5 rounds up to 3' },
  { value: 1.4, decimals: 0, expected: 1, description: '1.4 rounds down to 1' },
  { value: 1.6, decimals: 0, expected: 2, description: '1.6 rounds up to 2' },
  {
    value: 3229.025,
    decimals: 2,
    expected: 3229.03,
    description: 'COWZ case: 3229.025 rounds up to 3229.03',
  },
  {
    value: 3229.024,
    decimals: 2,
    expected: 3229.02,
    description: '3229.024 rounds down to 3229.02',
  },
  {
    value: 60.515,
    decimals: 2,
    expected: 60.52,
    description: '60.515 rounds up to 60.52',
  },
  {
    value: 0.30749,
    decimals: 4,
    expected: 0.3075,
    description: 'Penny stock: 0.30749 rounds up to 0.3075',
  },
  {
    value: 0.30745,
    decimals: 4,
    expected: 0.3075,
    description: 'Penny stock half up: 0.30745 rounds up to 0.3075',
  },
]
