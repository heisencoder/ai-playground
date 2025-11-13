import { useState, useEffect } from 'react'
import { StockGift } from '../types'
import { StockGiftRow } from './StockGiftRow'
import { fetchStockPrice } from '../services/stockApi'
import {
  calculateStockGiftValue,
  isValidDate,
  isValidTicker,
} from '../utils/calculations'
import './StockGiftCalculator.css'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function createEmptyGift(): StockGift {
  return {
    id: generateId(),
    date: '',
    ticker: '',
    shares: 0,
  }
}

export function StockGiftCalculator() {
  const [gifts, setGifts] = useState<StockGift[]>([createEmptyGift()])

  // Effect to calculate value when inputs change
  useEffect(() => {
    const calculateValues = async () => {
      for (const gift of gifts) {
        // Skip if any required field is missing
        if (!gift.date || !gift.ticker || !gift.shares) {
          // Clear value if fields are incomplete
          if (gift.value !== undefined || gift.error) {
            updateGift(gift.id, { value: undefined, error: undefined })
          }
          continue
        }

        // Skip if already loading
        if (gift.loading) {
          continue
        }

        // Create a cache key from inputs to check if we need to refetch
        const cacheKey = `${gift.ticker}-${gift.date}-${gift.shares}`
        if (
          gift.cacheKey === cacheKey &&
          (gift.value !== undefined || gift.error)
        ) {
          // Already calculated for these exact inputs
          continue
        }

        // Validate inputs
        if (!isValidDate(gift.date)) {
          if (gift.error !== 'Invalid date' || gift.cacheKey !== cacheKey) {
            updateGift(gift.id, {
              error: 'Invalid date',
              value: undefined,
              cacheKey,
            })
          }
          continue
        }

        if (!isValidTicker(gift.ticker)) {
          if (gift.error !== 'Invalid ticker' || gift.cacheKey !== cacheKey) {
            updateGift(gift.id, {
              error: 'Invalid ticker',
              value: undefined,
              cacheKey,
            })
          }
          continue
        }

        // Start loading
        updateGift(gift.id, { loading: true, error: undefined, cacheKey })

        try {
          const priceData = await fetchStockPrice(gift.ticker, gift.date)
          const value = calculateStockGiftValue(
            priceData.high,
            priceData.low,
            gift.shares
          )

          updateGift(gift.id, {
            value,
            loading: false,
            error: undefined,
            cacheKey,
          })
        } catch (error) {
          updateGift(gift.id, {
            error:
              error instanceof Error ? error.message : 'Failed to fetch price',
            loading: false,
            value: undefined,
            cacheKey,
          })
        }
      }
    }

    calculateValues()
  }, [gifts])

  const updateGift = (id: string, updates: Partial<StockGift>) => {
    setGifts((prevGifts) =>
      prevGifts.map((gift) => (gift.id === id ? { ...gift, ...updates } : gift))
    )
  }

  const addGift = () => {
    setGifts((prevGifts) => [...prevGifts, createEmptyGift()])
  }

  const removeGift = (id: string) => {
    setGifts((prevGifts) => prevGifts.filter((gift) => gift.id !== id))
  }

  return (
    <div className="calculator-container">
      <header className="calculator-header">
        <h1>Stock Gift Value Calculator</h1>
        <p className="subtitle">
          Calculate IRS-approved donated value based on the average of high and
          low prices
        </p>
      </header>

      <div className="gifts-list">
        {gifts.map((gift) => (
          <StockGiftRow
            key={gift.id}
            gift={gift}
            onUpdate={updateGift}
            onRemove={removeGift}
            showRemove={gifts.length > 1}
          />
        ))}
      </div>

      <button type="button" onClick={addGift} className="add-button">
        + Add Another Stock Gift
      </button>
    </div>
  )
}
