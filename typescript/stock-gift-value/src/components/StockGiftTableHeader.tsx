import type React from 'react'
import { StockGift } from '../types'

interface StockGiftTableHeaderProps {
  onSort: (field: 'date' | 'ticker' | 'shares' | 'value') => void
  getSortIndicator: (field: 'date' | 'ticker' | 'shares' | 'value') => string
  onCopy: (gifts: StockGift[]) => Promise<void>
  gifts: StockGift[]
  copyMessage: string | null
}

export function StockGiftTableHeader({
  onSort,
  getSortIndicator,
  onCopy,
  gifts,
  copyMessage,
}: StockGiftTableHeaderProps): React.JSX.Element {
  return (
    <thead>
      <tr>
        <th>
          <button
            type="button"
            onClick={() => onSort('date')}
            className="sort-button"
            aria-label={`Sort by date ${getSortIndicator('date')}`}
          >
            Date {getSortIndicator('date')}
          </button>
        </th>
        <th>
          <button
            type="button"
            onClick={() => onSort('ticker')}
            className="sort-button"
            aria-label={`Sort by ticker ${getSortIndicator('ticker')}`}
          >
            Ticker {getSortIndicator('ticker')}
          </button>
        </th>
        <th>
          <button
            type="button"
            onClick={() => onSort('shares')}
            className="sort-button"
            aria-label={`Sort by shares ${getSortIndicator('shares')}`}
          >
            Shares {getSortIndicator('shares')}
          </button>
        </th>
        <th className="value-header">
          <button
            type="button"
            onClick={() => onSort('value')}
            className="sort-button"
            aria-label={`Sort by value ${getSortIndicator('value')}`}
          >
            <span className="value-header-full">Fair Market Value</span>
            <span className="value-header-short">FMV</span>{' '}
            {getSortIndicator('value')}
          </button>
        </th>
        <th className="actions-header">
          <button
            type="button"
            onClick={() => {
              void onCopy(gifts)
            }}
            className="copy-button copy-button-desktop"
            aria-label="Copy all data to clipboard"
            title="Copy to clipboard"
          >
            📋
          </button>
          {copyMessage && (
            <span
              className="copy-message copy-message-desktop"
              role="status"
              aria-live="polite"
            >
              {copyMessage}
            </span>
          )}
        </th>
      </tr>
    </thead>
  )
}
