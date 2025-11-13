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
          continue
        }

        // Skip if already loading or has a value
        if (gift.loading) {
          continue
        }

        // Validate inputs
        if (!isValidDate(gift.date)) {
          updateGift(gift.id, { error: 'Invalid date', value: undefined })
          continue
        }

        if (!isValidTicker(gift.ticker)) {
          updateGift(gift.id, { error: 'Invalid ticker', value: undefined })
          continue
        }

        // Start loading
        updateGift(gift.id, { loading: true, error: undefined })

        try {
          const priceData = await fetchStockPrice(gift.ticker, gift.date)
          const value = calculateStockGiftValue(
            priceData.high,
            priceData.low,
            gift.shares
          )

          updateGift(gift.id, { value, loading: false, error: undefined })
        } catch (error) {
          updateGift(gift.id, {
            error:
              error instanceof Error ? error.message : 'Failed to fetch price',
            loading: false,
            value: undefined,
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
