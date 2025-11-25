import { useState } from 'react'
import { StockGift } from '../types'
import {
  MAX_ROWS,
  ID_TIMESTAMP_BASE,
  ID_RANDOM_LENGTH,
} from '../constants/stockGiftConstants'

/**
 * Generate unique ID for a gift
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(ID_TIMESTAMP_BASE).substr(2, ID_RANDOM_LENGTH)}`
}

/**
 * Create an empty gift entry
 */
function createEmptyGift(): StockGift {
  return {
    id: generateId(),
    date: '',
    ticker: '',
    shares: 0,
  }
}

/**
 * Check if a gift row is empty
 */
function isRowEmpty(gift: StockGift): boolean {
  return !gift.date && !gift.ticker && !gift.shares
}

export interface UseGiftManagementReturn {
  gifts: StockGift[]
  setGifts: React.Dispatch<React.SetStateAction<StockGift[]>>
  updateGift: (id: string, updates: Partial<StockGift>) => void
  removeGift: (id: string) => void
  handleInputChange: (
    id: string,
    field: 'date' | 'ticker' | 'shares',
    value: string | number
  ) => void
  handleBlur: (id: string) => void
  isRowEmpty: (gift: StockGift) => boolean
}

/**
 * Hook for managing gift state and operations
 */
export function useGiftManagement(): UseGiftManagementReturn {
  const [gifts, setGifts] = useState<StockGift[]>([createEmptyGift()])

  const updateGift = (id: string, updates: Partial<StockGift>): void => {
    setGifts((prevGifts) =>
      prevGifts.map((gift) => (gift.id === id ? { ...gift, ...updates } : gift))
    )
  }

  const removeGift = (id: string): void => {
    setGifts((prevGifts) => {
      const filtered = prevGifts.filter((gift) => gift.id !== id)
      // Always maintain at least one row
      return filtered.length === 0 ? [createEmptyGift()] : filtered
    })
  }

  const handleInputChange = (
    id: string,
    field: 'date' | 'ticker' | 'shares',
    value: string | number
  ): void => {
    setGifts((prevGifts) =>
      prevGifts.map((gift) =>
        gift.id === id
          ? {
              ...gift,
              [field]:
                field === 'ticker' ? (value as string).toUpperCase() : value,
            }
          : gift
      )
    )
  }

  const handleBlur = (id: string): void => {
    // Check if we need to add or remove rows after user leaves the cell
    setGifts((prevGifts) => {
      const giftIndex = prevGifts.findIndex((g) => g.id === id)
      if (giftIndex === -1) {
        return prevGifts
      }

      const gift = prevGifts[giftIndex]
      if (!gift) {
        return prevGifts
      }

      const isEmpty = isRowEmpty(gift)
      const isLastRow = giftIndex === prevGifts.length - 1

      // Add a new empty row if this was the last row and now has data
      if (!isEmpty && isLastRow && prevGifts.length < MAX_ROWS) {
        return [...prevGifts, createEmptyGift()]
      }

      // Remove this row if it's empty and there's another empty row
      const emptyCount = prevGifts.filter(isRowEmpty).length
      if (isEmpty && emptyCount > 1 && prevGifts.length > 1) {
        return prevGifts.filter((_, i) => i !== giftIndex)
      }

      return prevGifts
    })
  }

  return {
    gifts,
    setGifts,
    updateGift,
    removeGift,
    handleInputChange,
    handleBlur,
    isRowEmpty,
  }
}
