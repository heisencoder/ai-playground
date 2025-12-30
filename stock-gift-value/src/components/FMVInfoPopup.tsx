import type React from 'react'
import { useEffect, useRef } from 'react'
import {
  getFMVCalculationDetails,
  formatCurrency,
} from '../utils/calculations'

const DECIMAL_PLACES_TWO = 2
const DECIMAL_PLACES_THREE = 3

export interface FMVInfoPopupProps {
  highPrice: number
  lowPrice: number
  shares: number
  onClose: () => void
}

/**
 * Format a number to a specific number of decimal places
 */
function formatDecimal(value: number, decimals: number): string {
  return value.toFixed(decimals)
}

/**
 * Popup component that displays the FMV calculation breakdown
 * Shows high/low prices, average, and final calculation with proper precision
 */
export function FMVInfoPopup({
  highPrice,
  lowPrice,
  shares,
  onClose,
}: FMVInfoPopupProps): React.JSX.Element {
  const popupRef = useRef<HTMLDivElement>(null)

  // Get all the calculation details
  const details = getFMVCalculationDetails(highPrice, lowPrice, shares)

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    // Add event listener on next tick to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // Handle escape key to close
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [onClose])

  return (
    <div
      ref={popupRef}
      className="fmv-info-popup"
      role="dialog"
      aria-label="Fair Market Value calculation details"
    >
      <div className="fmv-info-header">
        <span className="fmv-info-title">FMV Calculation</span>
        <button
          type="button"
          onClick={onClose}
          className="fmv-info-close"
          aria-label="Close"
        >
          &times;
        </button>
      </div>
      <div className="fmv-info-content">
        <div className="fmv-calculation-step">
          <span className="fmv-step-label">Day High:</span>
          <span className="fmv-step-value">
            ${formatDecimal(details.roundedHigh, DECIMAL_PLACES_TWO)}
          </span>
        </div>
        <div className="fmv-calculation-step">
          <span className="fmv-step-label">Day Low:</span>
          <span className="fmv-step-value">
            ${formatDecimal(details.roundedLow, DECIMAL_PLACES_TWO)}
          </span>
        </div>
        <div className="fmv-calculation-step fmv-step-divider">
          <span className="fmv-step-label">Average:</span>
          <span className="fmv-step-value">
            (${formatDecimal(details.roundedHigh, DECIMAL_PLACES_TWO)} + $
            {formatDecimal(details.roundedLow, DECIMAL_PLACES_TWO)}) / 2 = $
            {formatDecimal(details.averagePrice, DECIMAL_PLACES_THREE)}
          </span>
        </div>
        <div className="fmv-calculation-step">
          <span className="fmv-step-label">Shares:</span>
          <span className="fmv-step-value">{shares}</span>
        </div>
        <div className="fmv-calculation-step fmv-step-divider">
          <span className="fmv-step-label">Total:</span>
          <span className="fmv-step-value">
            ${formatDecimal(details.averagePrice, DECIMAL_PLACES_THREE)} &times;{' '}
            {shares} = ${formatDecimal(details.totalBeforeRounding, DECIMAL_PLACES_THREE)}
          </span>
        </div>
        <div className="fmv-calculation-step fmv-step-result">
          <span className="fmv-step-label">FMV:</span>
          <span className="fmv-step-value fmv-final-value">
            {formatCurrency(details.finalValue)}
          </span>
        </div>
      </div>
    </div>
  )
}
