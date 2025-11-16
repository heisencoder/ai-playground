import type React from 'react'
import { formatCurrency } from '../utils/calculations'
import { useGiftManagement } from '../hooks/useGiftManagement'
import { useGiftValueCalculation } from '../hooks/useGiftValueCalculation'
import { useSorting } from '../hooks/useSorting'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { useClipboard } from '../hooks/useClipboard'
import { StockGiftTableHeader } from './StockGiftTableHeader'
import { TickerAutocompleteInput } from './TickerAutocompleteInput'
import { DateInput } from './DateInput'
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
        <div className="subtitle-container">
          <p className="subtitle">
            Calculate IRS-approved donated value based on the average of high
            and low prices
          </p>
          <button
            type="button"
            onClick={() => {
              void handleCopy(gifts)
            }}
            className="copy-button copy-button-header"
            aria-label="Copy all data to clipboard"
            title="Copy to clipboard"
          >
            📋
          </button>
          {copyMessage && (
            <span
              className="copy-message copy-message-header"
              role="status"
              aria-live="polite"
            >
              {copyMessage}
            </span>
          )}
        </div>
      </header>

      <div className="table-container">
        <table className="stock-gift-table" role="table">
          <StockGiftTableHeader
            onSort={handleSort}
            getSortIndicator={getSortIndicator}
            onCopy={handleCopy}
            gifts={gifts}
            copyMessage={copyMessage}
          />
          <tbody>
            {sortedGifts.map((gift) => (
              <tr key={gift.id} className="stock-gift-row">
                <td>
                  <DateInput
                    id={`date-${gift.id}`}
                    value={gift.date}
                    onChange={(value) =>
                      handleInputChange(gift.id, 'date', value)
                    }
                    onBlur={() => handleBlur(gift.id)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, gift.id, 'date', sortedGifts)
                    }
                    inputRef={(el) => setInputRef(gift.id, 'date', el)}
                    className="date-input"
                    {...(maxDate && { maxDate })}
                  />
                </td>
                <td>
                  <TickerAutocompleteInput
                    id={`ticker-${gift.id}`}
                    value={gift.ticker}
                    onChange={(value) =>
                      handleInputChange(gift.id, 'ticker', value)
                    }
                    onBlur={() => handleBlur(gift.id)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, gift.id, 'ticker', sortedGifts)
                    }
                    inputRef={(el) => setInputRef(gift.id, 'ticker', el)}
                    className="ticker-input"
                    placeholder="AAPL"
                    hasError={!!gift.error}
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
                      tabIndex={-1}
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
