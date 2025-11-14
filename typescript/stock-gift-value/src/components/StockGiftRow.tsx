import type React from 'react'
import { StockGift } from '../types'
import { formatCurrency } from '../utils/calculations'
import './StockGiftRow.css'

interface StockGiftRowProps {
  gift: StockGift
  onUpdate: (id: string, updates: Partial<StockGift>) => void
  onRemove: (id: string) => void
  showRemove: boolean
}

export function StockGiftRow({
  gift,
  onUpdate,
  onRemove,
  showRemove,
}: StockGiftRowProps): React.JSX.Element {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onUpdate(gift.id, { date: e.target.value })
  }

  const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onUpdate(gift.id, { ticker: e.target.value.toUpperCase() })
  }

  const handleSharesChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const shares = parseFloat(e.target.value)
    onUpdate(gift.id, { shares: isNaN(shares) ? 0 : shares })
  }

  const handleRemove = (): void => {
    onRemove(gift.id)
  }

  return (
    <div className="stock-gift-row">
      <div className="input-group">
        <label htmlFor={`date-${gift.id}`}>Date</label>
        <input
          id={`date-${gift.id}`}
          type="date"
          value={gift.date}
          onChange={handleDateChange}
          className="date-input"
          max={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div className="input-group">
        <label htmlFor={`ticker-${gift.id}`}>Ticker</label>
        <input
          id={`ticker-${gift.id}`}
          type="text"
          value={gift.ticker}
          onChange={handleTickerChange}
          className="ticker-input"
          placeholder="AAPL"
          maxLength={10}
        />
      </div>

      <div className="input-group">
        <label htmlFor={`shares-${gift.id}`}>Shares</label>
        <input
          id={`shares-${gift.id}`}
          type="number"
          value={gift.shares || ''}
          onChange={handleSharesChange}
          className="shares-input"
          placeholder="0"
          min="0"
          step="any"
        />
      </div>

      <div className="input-group value-group">
        <label htmlFor={`value-${gift.id}`}>Value</label>
        <div className="value-display">
          {gift.loading && <span className="loading">Loading...</span>}
          {gift.error && <span className="error">{gift.error}</span>}
          {!gift.loading && !gift.error && gift.value !== undefined && (
            <span className="value">{formatCurrency(gift.value)}</span>
          )}
          {!gift.loading && !gift.error && gift.value === undefined && (
            <span className="placeholder">—</span>
          )}
        </div>
      </div>

      {showRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="remove-button"
          aria-label="Remove row"
        >
          ×
        </button>
      )}
    </div>
  )
}
