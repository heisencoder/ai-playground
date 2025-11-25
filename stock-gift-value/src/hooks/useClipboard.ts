import { useState } from 'react'
import { StockGift } from '../types'
import { formatCurrency } from '../utils/calculations'
import { COPY_MESSAGE_TIMEOUT } from '../constants/stockGiftConstants'

export interface UseClipboardReturn {
  copyMessage: string
  handleCopy: (gifts: StockGift[]) => Promise<void>
}

/**
 * Hook for managing clipboard operations
 */
export function useClipboard(
  isRowEmpty: (gift: StockGift) => boolean
): UseClipboardReturn {
  const [copyMessage, setCopyMessage] = useState<string>('')

  const handleCopy = async (gifts: StockGift[]): Promise<void> => {
    const nonEmptyGifts = gifts.filter((gift) => !isRowEmpty(gift))

    // Create TSV format
    const header = 'Date\tTicker\tShares\tValue'
    const rows = nonEmptyGifts.map((gift) => {
      const valueText = gift.loading
        ? 'Loading...'
        : gift.error
          ? 'Error'
          : gift.value !== undefined
            ? formatCurrency(gift.value)
            : ''

      return `${gift.date}\t${gift.ticker}\t${gift.shares}\t${valueText}`
    })

    const tsvText = [header, ...rows].join('\n')

    try {
      await navigator.clipboard.writeText(tsvText)
      setCopyMessage('Copied to clipboard!')
      setTimeout(() => {
        setCopyMessage('')
      }, COPY_MESSAGE_TIMEOUT)
    } catch (error) {
      setCopyMessage('Failed to copy')
      setTimeout(() => {
        setCopyMessage('')
      }, COPY_MESSAGE_TIMEOUT)
    }
  }

  return {
    copyMessage,
    handleCopy,
  }
}
