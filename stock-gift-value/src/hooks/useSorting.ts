import { useState } from 'react'
import { StockGift } from '../types'

export type SortColumn = 'date' | 'ticker' | 'shares' | 'value'
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  column: SortColumn
  direction: SortDirection
}

export interface UseSortingReturn {
  sortConfig: SortConfig | null
  sortGifts: (giftsToSort: StockGift[]) => StockGift[]
  handleSort: (column: SortColumn) => void
  getSortIndicator: (column: SortColumn) => string
}

/**
 * Get sort value for a gift based on the sort column
 */
function getSortValue(gift: StockGift, column: SortColumn): string | number {
  const negativeInfinity = Number.NEGATIVE_INFINITY

  switch (column) {
    case 'date': {
      return gift.date ?? ''
    }
    case 'ticker': {
      return gift.ticker ?? ''
    }
    case 'shares': {
      return gift.shares ?? 0
    }
    case 'value': {
      // Sort by value, putting loading/error states at the end
      if (gift.loading || gift.error) {
        return negativeInfinity
      }
      return gift.value ?? negativeInfinity
    }
    default: {
      return ''
    }
  }
}

/**
 * Hook for managing sorting state and logic
 */
export function useSorting(
  isRowEmpty: (gift: StockGift) => boolean
): UseSortingReturn {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)

  const sortGifts = (giftsToSort: StockGift[]): StockGift[] => {
    if (!sortConfig) {
      return giftsToSort
    }

    const nonEmptyGifts = giftsToSort.filter((gift) => !isRowEmpty(gift))
    const emptyGifts = giftsToSort.filter((gift) => isRowEmpty(gift))

    const sorted = [...nonEmptyGifts].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.column)
      const bValue = getSortValue(b, sortConfig.column)

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })

    // Keep empty rows at the bottom
    return [...sorted, ...emptyGifts]
  }

  const handleSort = (column: SortColumn): void => {
    setSortConfig((prevConfig) => {
      if (!prevConfig || prevConfig.column !== column) {
        // First click: sort ascending
        return { column, direction: 'asc' }
      }
      if (prevConfig.direction === 'asc') {
        // Second click: sort descending
        return { column, direction: 'desc' }
      }
      // Third click: remove sort
      return null
    })
  }

  const getSortIndicator = (column: SortColumn): string => {
    if (!sortConfig || sortConfig.column !== column) {
      return '↕'
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  return {
    sortConfig,
    sortGifts,
    handleSort,
    getSortIndicator,
  }
}
