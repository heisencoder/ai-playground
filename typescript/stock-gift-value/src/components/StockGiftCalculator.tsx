import type React from 'react'
import { formatCurrency } from '../utils/calculations'
import { useGiftManagement } from '../hooks/useGiftManagement'
import { useGiftValueCalculation } from '../hooks/useGiftValueCalculation'
import { useSorting } from '../hooks/useSorting'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { useClipboard } from '../hooks/useClipboard'
import './StockGiftCalculator.css'

export function StockGiftCalculator(): React.JSX.Element {
  // Use custom hooks for different concerns
  const {
    gifts,
    updateGift,
    removeGift,
    handleInputChange,
    handleBlur,
    isRowEmpty,
  } = useGiftManagement()

  const { sortGifts, handleSort, getSortIndicator } = useSorting(isRowEmpty)
  const { setInputRef, handleKeyDown } = useKeyboardNavigation()
  const { copyMessage, handleCopy } = useClipboard(isRowEmpty)

  // Automatically calculate values when inputs change
  useGiftValueCalculation(gifts, updateGift)

  const sortedGifts = sortGifts(gifts)

  // Get yesterday's date since market prices are only known after close
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const maxDate = yesterday.toISOString().split('T')[0]

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
                  onClick={() => {
                    void handleCopy(gifts)
                  }}
                  className="copy-button"
                  aria-label="Copy all data to clipboard"
                  title="Copy to clipboard"
                >
                  📋
                </button>
                {copyMessage && (
                  <span
                    className="copy-message"
                    role="status"
                    aria-live="polite"
                  >
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
                    onKeyDown={(e) =>
                      handleKeyDown(e, gift.id, 'date', sortedGifts)
                    }
                    className="date-input"
                    max={maxDate}
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
                    onKeyDown={(e) =>
                      handleKeyDown(e, gift.id, 'ticker', sortedGifts)
                    }
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
                    onKeyDown={(e) =>
                      handleKeyDown(e, gift.id, 'shares', sortedGifts)
                    }
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
