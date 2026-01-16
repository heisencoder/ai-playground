import { describe, it, expect } from 'vitest'
import {
  formatPercent,
  formatPrice,
  formatCurrency,
  probabilityToPercent,
} from '../formatting.js'

describe('formatting utilities', () => {
  describe('formatPercent', () => {
    it('should format number as percentage', () => {
      expect(formatPercent(5.5)).toBe('5.50%')
    })

    it('should handle zero', () => {
      expect(formatPercent(0)).toBe('0.00%')
    })

    it('should handle negative numbers', () => {
      expect(formatPercent(-2.5)).toBe('-2.50%')
    })

    it('should round to 2 decimal places', () => {
      expect(formatPercent(3.456)).toBe('3.46%')
    })
  })

  describe('formatPrice', () => {
    it('should format price with 3 decimal places', () => {
      expect(formatPrice(0.5)).toBe('0.500')
    })

    it('should format small prices', () => {
      expect(formatPrice(0.001)).toBe('0.001')
    })

    it('should round correctly', () => {
      expect(formatPrice(0.12345)).toBe('0.123')
    })
  })

  describe('formatCurrency', () => {
    it('should format as USD currency', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should handle large numbers with commas', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00')
    })
  })

  describe('probabilityToPercent', () => {
    it('should convert 0.5 to 50', () => {
      expect(probabilityToPercent(0.5)).toBe(50)
    })

    it('should convert 1.0 to 100', () => {
      expect(probabilityToPercent(1.0)).toBe(100)
    })

    it('should convert 0.05 to 5', () => {
      expect(probabilityToPercent(0.05)).toBe(5)
    })
  })
})
