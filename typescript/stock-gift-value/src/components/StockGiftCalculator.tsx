import { useState, useEffect, useRef } from 'react'
import { StockGift } from '../types'
import { fetchStockPrice } from '../services/stockApi'
import {
  calculateStockGiftValue,
  isValidDate,
  isValidTicker,
  formatCurrency,
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

type SortColumn = 'date' | 'ticker' | 'shares' | 'value'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  column: SortColumn
  direction: SortDirection
}

const MAX_ROWS = 50

export function StockGiftCalculator() {
  const [gifts, setGifts] = useState<StockGift[]>([createEmptyGift()])
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [copyMessage, setCopyMessage] = useState<string>('')

  // Refs for keyboard navigation
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

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

  const removeGift = (id: string) => {
    setGifts((prevGifts) => {
      const filtered = prevGifts.filter((gift) => gift.id !== id)
      // Always maintain at least one row
      return filtered.length === 0 ? [createEmptyGift()] : filtered
    })
  }

  const isRowEmpty = (gift: StockGift): boolean => {
    return !gift.date && !gift.ticker && !gift.shares
  }

  const handleInputChange = (
    id: string,
    field: 'date' | 'ticker' | 'shares',
    value: string | number
  ) => {
    setGifts((prevGifts) =>
      prevGifts.map((gift) =>
        gift.id === id
          ? {
              ...gift,
              [field]: field === 'ticker' ? (value as string).toUpperCase() : value,
            }
          : gift
      )
    )
  }

  const handleBlur = (id: string) => {
    // Check if we need to add or remove rows after user leaves the cell
    setGifts((prevGifts) => {
      const giftIndex = prevGifts.findIndex((g) => g.id === id)
      if (giftIndex === -1) return prevGifts

      const gift = prevGifts[giftIndex]
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

  const sortGifts = (giftsToSort: StockGift[]): StockGift[] => {
    if (!sortConfig) return giftsToSort

    const nonEmptyGifts = giftsToSort.filter((gift) => !isRowEmpty(gift))
    const emptyGifts = giftsToSort.filter((gift) => isRowEmpty(gift))

    const sorted = [...nonEmptyGifts].sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortConfig.column) {
        case 'date': {
          aValue = a.date || ''
          bValue = b.date || ''
          break
        }
        case 'ticker': {
          aValue = a.ticker || ''
          bValue = b.ticker || ''
          break
        }
        case 'shares': {
          aValue = a.shares || 0
          bValue = b.shares || 0
          break
        }
        case 'value': {
          // Sort by value, putting loading/error states at the end
          if (a.loading || a.error) aValue = -Infinity
          else aValue = a.value || -Infinity
          if (b.loading || b.error) bValue = -Infinity
          else bValue = b.value || -Infinity
          break
        }
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    // Keep empty rows at the bottom
    return [...sorted, ...emptyGifts]
  }

  const handleSort = (column: SortColumn) => {
    setSortConfig((prevConfig) => {
      if (!prevConfig || prevConfig.column !== column) {
        // First click: sort ascending
        return { column, direction: 'asc' }
      } else if (prevConfig.direction === 'asc') {
        // Second click: sort descending
        return { column, direction: 'desc' }
      } else {
        // Third click: remove sort
        return null
      }
    })
  }

  const getSortIndicator = (column: SortColumn): string => {
    if (!sortConfig || sortConfig.column !== column) {
      return '↕'
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const handleCopy = async () => {
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
      setTimeout(() => setCopyMessage(''), 2000)
    } catch (error) {
      setCopyMessage('Failed to copy')
      setTimeout(() => setCopyMessage(''), 2000)
    }
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowId: string,
    field: 'date' | 'ticker' | 'shares'
  ) => {
    const sortedGifts = sortGifts(gifts)
    const currentRowIndex = sortedGifts.findIndex((g) => g.id === rowId)

    let targetRowId: string | null = null
    let targetField: 'date' | 'ticker' | 'shares' | null = null

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        if (currentRowIndex > 0) {
          targetRowId = sortedGifts[currentRowIndex - 1].id
          targetField = field
        }
        break

      case 'ArrowDown':
      case 'Enter':
        e.preventDefault()
        if (currentRowIndex < sortedGifts.length - 1) {
          targetRowId = sortedGifts[currentRowIndex + 1].id
          targetField = field
        }
        break

      case 'ArrowLeft': {
        // Only navigate if cursor is at the start of input
        const input = e.target as HTMLInputElement
        // Date inputs don't support selectionStart, so always allow navigation
        const shouldNavigate = input.type === 'date' || input.selectionStart === 0
        if (shouldNavigate) {
          e.preventDefault()
          targetRowId = rowId
          if (field === 'shares') targetField = 'ticker'
          else if (field === 'ticker') targetField = 'date'
        }
        break
      }

      case 'ArrowRight': {
        // Only navigate if cursor is at the end of input
        const input = e.target as HTMLInputElement
        // Date inputs don't support selectionStart, so always allow navigation
        const shouldNavigate = input.type === 'date' || input.selectionStart === input.value.length
        if (shouldNavigate) {
          e.preventDefault()
          targetRowId = rowId
          if (field === 'date') targetField = 'ticker'
          else if (field === 'ticker') targetField = 'shares'
        }
        break
      }

      case 'Tab':
        // Let default tab behavior work, but we could customize if needed
        break
    }

    if (targetRowId && targetField) {
      const key = `${targetRowId}-${targetField}`
      const targetInput = inputRefs.current.get(key)
      if (targetInput) {
        targetInput.focus()
      }
    }
  }

  const setInputRef = (
    rowId: string,
    field: 'date' | 'ticker' | 'shares',
    element: HTMLInputElement | null
  ) => {
    const key = `${rowId}-${field}`
    if (element) {
      inputRefs.current.set(key, element)
    } else {
      inputRefs.current.delete(key)
    }
  }

  const sortedGifts = sortGifts(gifts)

  return (
    <div className="calculator-container">
      <header className="calculator-header">
        <h1>Stock Gift Value Calculator</h1>
        <p className="subtitle">
          Calculate IRS-approved donated value based on the average of high and
          low prices
        </p>
      </header>

      <div className="table-container">
        <table className="stock-gift-table" role="table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  onClick={() => handleSort('date')}
                  className="sort-button"
                  aria-label={`Sort by date ${getSortIndicator('date')}`}
                >
                  Date {getSortIndicator('date')}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  onClick={() => handleSort('ticker')}
                  className="sort-button"
                  aria-label={`Sort by ticker ${getSortIndicator('ticker')}`}
                >
                  Ticker {getSortIndicator('ticker')}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  onClick={() => handleSort('shares')}
                  className="sort-button"
                  aria-label={`Sort by shares ${getSortIndicator('shares')}`}
                >
                  Shares {getSortIndicator('shares')}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  onClick={() => handleSort('value')}
                  className="sort-button"
                  aria-label={`Sort by value ${getSortIndicator('value')}`}
                >
                  Value {getSortIndicator('value')}
                </button>
              </th>
              <th className="actions-header">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="copy-button"
                  aria-label="Copy all data to clipboard"
                  title="Copy to clipboard"
                >
                  📋
                </button>
                {copyMessage && (
                  <span className="copy-message" role="status" aria-live="polite">
                    {copyMessage}
                  </span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedGifts.map((gift) => (
              <tr key={gift.id} className="stock-gift-row">
                <td>
                  <input
                    ref={(el) => setInputRef(gift.id, 'date', el)}
                    id={`date-${gift.id}`}
                    type="date"
                    value={gift.date}
                    onChange={(e) =>
                      handleInputChange(gift.id, 'date', e.target.value)
                    }
                    onBlur={() => handleBlur(gift.id)}
                    onKeyDown={(e) => handleKeyDown(e, gift.id, 'date')}
                    className="date-input"
                    max={new Date().toISOString().split('T')[0]}
                    aria-label="Date"
                  />
                </td>
                <td>
                  <input
                    ref={(el) => setInputRef(gift.id, 'ticker', el)}
                    id={`ticker-${gift.id}`}
                    type="text"
                    value={gift.ticker}
                    onChange={(e) =>
                      handleInputChange(gift.id, 'ticker', e.target.value)
                    }
                    onBlur={() => handleBlur(gift.id)}
                    onKeyDown={(e) => handleKeyDown(e, gift.id, 'ticker')}
                    className="ticker-input"
                    placeholder="AAPL"
                    maxLength={10}
                    aria-label="Ticker"
                  />
                </td>
                <td>
                  <input
                    ref={(el) => setInputRef(gift.id, 'shares', el)}
                    id={`shares-${gift.id}`}
                    type="number"
                    value={gift.shares || ''}
                    onChange={(e) =>
                      handleInputChange(
                        gift.id,
                        'shares',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    onBlur={() => handleBlur(gift.id)}
                    onKeyDown={(e) => handleKeyDown(e, gift.id, 'shares')}
                    className="shares-input"
                    placeholder="0"
                    min="0"
                    step="any"
                    aria-label="Shares"
                  />
                </td>
                <td className="value-cell">
                  {gift.loading && <span className="loading">Loading...</span>}
                  {gift.error && <span className="error">{gift.error}</span>}
                  {!gift.loading && !gift.error && gift.value !== undefined && (
                    <span className="value">{formatCurrency(gift.value)}</span>
                  )}
                  {!gift.loading && !gift.error && gift.value === undefined && (
                    <span className="placeholder">—</span>
                  )}
                </td>
                <td className="actions-cell">
                  {!isRowEmpty(gift) && (
                    <button
                      type="button"
                      onClick={() => removeGift(gift.id)}
                      className="remove-button"
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
