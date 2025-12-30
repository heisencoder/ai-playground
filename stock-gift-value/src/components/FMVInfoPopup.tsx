import { useEffect, useRef, useState, type JSX } from 'react'
import { createPortal } from 'react-dom'
import { getFMVCalculationDetails, formatCurrency } from '../utils/calculations'

const DECIMAL_PLACES_TWO = 2
const DECIMAL_PLACES_THREE = 3
const POPUP_WIDTH = 280
const POPUP_MARGIN = 8

export interface FMVInfoPopupProps {
  highPrice: number
  lowPrice: number
  shares: number
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}

interface PopupPosition {
  top: number
  left: number
}

/**
 * Format a number to a specific number of decimal places
 */
function formatDecimal(value: number, decimals: number): string {
  return value.toFixed(decimals)
}

/**
 * Calculate the popup position based on the anchor element
 */
function calculatePosition(
  anchorRef: React.RefObject<HTMLButtonElement | null>
): PopupPosition {
  if (!anchorRef.current) {
    return { top: 0, left: 0 }
  }

  const rect = anchorRef.current.getBoundingClientRect()

  // Position below the button, aligned to the right edge
  const top = rect.bottom + POPUP_MARGIN
  // Align right edge of popup with right edge of button
  const left = rect.right - POPUP_WIDTH

  return { top, left }
}

/**
 * Popup component that displays the FMV calculation breakdown
 * Shows high/low prices, average, and final calculation with proper precision
 * Uses a Portal to render outside the table to avoid scrollbar issues
 */
/* eslint-disable-next-line max-lines-per-function -- Component with portal, positioning, and event handlers */
export function FMVInfoPopup({
  highPrice,
  lowPrice,
  shares,
  onClose,
  anchorRef,
}: FMVInfoPopupProps): JSX.Element {
  const popupRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<PopupPosition>({ top: 0, left: 0 })

  // Get all the calculation details
  const details = getFMVCalculationDetails(highPrice, lowPrice, shares)

  // Calculate position on mount and when anchor changes
  useEffect(() => {
    setPosition(calculatePosition(anchorRef))
  }, [anchorRef])

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

  const popupContent = (
    <div
      ref={popupRef}
      className="fmv-info-popup"
      role="dialog"
      aria-label="Fair Market Value calculation details"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${POPUP_WIDTH}px`,
      }}
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
            {shares} = $
            {formatDecimal(details.totalBeforeRounding, DECIMAL_PLACES_THREE)}
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

  // Render using a portal to place popup outside the table DOM hierarchy
  return createPortal(popupContent, document.body)
}
