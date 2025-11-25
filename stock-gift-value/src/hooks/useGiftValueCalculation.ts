import { useEffect } from 'react'
import { StockGift } from '../types'
import { fetchStockPrice } from '../services/stockApi'
import {
  calculateStockGiftValue,
  isValidDate,
  isValidTicker,
} from '../utils/calculations'

/**
 * Check if gift should be skipped or cleared
 */
function shouldSkipGift(gift: StockGift): boolean {
  return (
    !gift.date ||
    !gift.ticker ||
    !gift.shares ||
    Boolean(gift.loading) ||
    Boolean(gift.tickerInputFocused)
  )
}

/**
 * Check if gift should clear its value
 */
function shouldClearValue(gift: StockGift): boolean {
  return (
    (!gift.date || !gift.ticker || !gift.shares) &&
    (gift.value !== undefined || Boolean(gift.error))
  )
}

/**
 * Create cache key for gift
 */
function createCacheKey(gift: StockGift): string {
  return `${gift.ticker}-${gift.date}-${gift.shares}`
}

/**
 * Check if calculation is already cached
 */
function isAlreadyCached(gift: StockGift, cacheKey: string): boolean {
  return (
    gift.cacheKey === cacheKey &&
    (gift.value !== undefined || Boolean(gift.error))
  )
}

/**
 * Validate gift data and update with error if invalid
 */
function validateGiftData(
  gift: StockGift,
  cacheKey: string,
  updateGift: (id: string, updates: Partial<StockGift>) => void
): boolean {
  if (!isValidDate(gift.date)) {
    if (gift.error !== 'Invalid date' || gift.cacheKey !== cacheKey) {
      updateGift(gift.id, {
        error: 'Invalid date',
        value: undefined,
        cacheKey,
      })
    }
    return false
  }

  if (!isValidTicker(gift.ticker)) {
    if (gift.error !== 'Invalid ticker' || gift.cacheKey !== cacheKey) {
      updateGift(gift.id, {
        error: 'Invalid ticker',
        value: undefined,
        cacheKey,
      })
    }
    return false
  }

  return true
}

/**
 * Fetch and calculate gift value
 */
async function fetchGiftValue(
  gift: StockGift,
  cacheKey: string,
  updateGift: (id: string, updates: Partial<StockGift>) => void
): Promise<void> {
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
      error: error instanceof Error ? error.message : 'Failed to fetch price',
      loading: false,
      value: undefined,
      cacheKey,
    })
  }
}

/**
 * Process a single gift for value calculation
 */
async function processGiftCalculation(
  gift: StockGift,
  updateGift: (id: string, updates: Partial<StockGift>) => void
): Promise<void> {
  // Clear value if fields are incomplete
  if (shouldClearValue(gift)) {
    updateGift(gift.id, { value: undefined, error: undefined })
  }

  // Skip if conditions not met
  if (shouldSkipGift(gift)) {
    return
  }

  const cacheKey = createCacheKey(gift)

  // Skip if already calculated
  if (isAlreadyCached(gift, cacheKey)) {
    return
  }

  // Validate inputs
  if (!validateGiftData(gift, cacheKey, updateGift)) {
    return
  }

  // Start loading and fetch value
  updateGift(gift.id, { loading: true, error: undefined, cacheKey })
  await fetchGiftValue(gift, cacheKey, updateGift)
}

/**
 * Hook for managing automatic value calculation for gifts
 */
export function useGiftValueCalculation(
  gifts: StockGift[],
  updateGift: (id: string, updates: Partial<StockGift>) => void
): void {
  useEffect(() => {
    const calculateValues = async (): Promise<void> => {
      const calculations = gifts.map((gift) =>
        processGiftCalculation(gift, updateGift)
      )
      await Promise.all(calculations)
    }

    void calculateValues()
  }, [gifts, updateGift])
}
