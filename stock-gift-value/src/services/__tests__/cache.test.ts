import { describe, it, expect, beforeEach } from 'vitest'
import { stockPriceCache } from '../cache'
import { StockPriceData } from '../../types'

describe('stockPriceCache', () => {
  beforeEach(() => {
    stockPriceCache.clear()
  })

  it('should store and retrieve data', () => {
    const data: StockPriceData = {
      date: '2024-01-01',
      high: 150,
      low: 145,
      ticker: 'AAPL',
    }

    stockPriceCache.set('AAPL', '2024-01-01', data)
    const retrieved = stockPriceCache.get('AAPL', '2024-01-01')

    expect(retrieved).toEqual(data)
  })

  it('should normalize ticker to uppercase', () => {
    const data: StockPriceData = {
      date: '2024-01-01',
      high: 150,
      low: 145,
      ticker: 'AAPL',
    }

    stockPriceCache.set('aapl', '2024-01-01', data)
    const retrieved = stockPriceCache.get('AAPL', '2024-01-01')

    expect(retrieved).toEqual(data)
  })

  it('should return null for non-existent entries', () => {
    const retrieved = stockPriceCache.get('AAPL', '2024-01-01')
    expect(retrieved).toBeNull()
  })

  it('should clear all cached data', () => {
    const data: StockPriceData = {
      date: '2024-01-01',
      high: 150,
      low: 145,
      ticker: 'AAPL',
    }

    stockPriceCache.set('AAPL', '2024-01-01', data)
    expect(stockPriceCache.size()).toBe(1)

    stockPriceCache.clear()
    expect(stockPriceCache.size()).toBe(0)

    const retrieved = stockPriceCache.get('AAPL', '2024-01-01')
    expect(retrieved).toBeNull()
  })

  it('should track cache size', () => {
    expect(stockPriceCache.size()).toBe(0)

    const data: StockPriceData = {
      date: '2024-01-01',
      high: 150,
      low: 145,
      ticker: 'AAPL',
    }

    stockPriceCache.set('AAPL', '2024-01-01', data)
    expect(stockPriceCache.size()).toBe(1)

    stockPriceCache.set('MSFT', '2024-01-01', { ...data, ticker: 'MSFT' })
    expect(stockPriceCache.size()).toBe(2)
  })

  it('should handle multiple tickers and dates', () => {
    const data1: StockPriceData = {
      date: '2024-01-01',
      high: 150,
      low: 145,
      ticker: 'AAPL',
    }
    const data2: StockPriceData = {
      date: '2024-01-02',
      high: 155,
      low: 150,
      ticker: 'AAPL',
    }
    const data3: StockPriceData = {
      date: '2024-01-01',
      high: 300,
      low: 290,
      ticker: 'MSFT',
    }

    stockPriceCache.set('AAPL', '2024-01-01', data1)
    stockPriceCache.set('AAPL', '2024-01-02', data2)
    stockPriceCache.set('MSFT', '2024-01-01', data3)

    expect(stockPriceCache.get('AAPL', '2024-01-01')).toEqual(data1)
    expect(stockPriceCache.get('AAPL', '2024-01-02')).toEqual(data2)
    expect(stockPriceCache.get('MSFT', '2024-01-01')).toEqual(data3)
  })
})
