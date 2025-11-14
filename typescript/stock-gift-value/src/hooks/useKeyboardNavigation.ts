import { useRef } from 'react'
import { StockGift } from '../types'

type FieldType = 'date' | 'ticker' | 'shares'

interface NavigationTarget {
  rowId: string | null
  field: FieldType | null
}

export interface UseKeyboardNavigationReturn {
  setInputRef: (
    rowId: string,
    field: FieldType,
    element: HTMLInputElement | null
  ) => void
  handleKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowId: string,
    field: FieldType,
    sortedGifts: StockGift[]
  ) => void
}

/**
 * Get the field to the left of the current field
 */
function getLeftField(field: FieldType): FieldType | null {
  if (field === 'shares') {
    return 'ticker'
  }
  if (field === 'ticker') {
    return 'date'
  }
  return null
}

/**
 * Get the field to the right of the current field
 */
function getRightField(field: FieldType): FieldType | null {
  if (field === 'date') {
    return 'ticker'
  }
  if (field === 'ticker') {
    return 'shares'
  }
  return null
}

/**
 * Hook for managing keyboard navigation between input fields
 */
export function useKeyboardNavigation(): UseKeyboardNavigationReturn {
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const setInputRef = (
    rowId: string,
    field: FieldType,
    element: HTMLInputElement | null
  ): void => {
    const key = `${rowId}-${field}`
    if (element) {
      inputRefs.current.set(key, element)
    } else {
      inputRefs.current.delete(key)
    }
  }

  const focusTarget = (target: NavigationTarget): void => {
    if (target.rowId && target.field) {
      const key = `${target.rowId}-${target.field}`
      const targetInput = inputRefs.current.get(key)
      if (targetInput) {
        targetInput.focus()
      }
    }
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowId: string,
    field: FieldType,
    sortedGifts: StockGift[]
  ): void => {
    const currentRowIndex = sortedGifts.findIndex((g) => g.id === rowId)
    const target: NavigationTarget = { rowId: null, field: null }

    switch (e.key) {
      case 'ArrowUp': {
        e.preventDefault()
        if (currentRowIndex > 0) {
          const previousGift = sortedGifts[currentRowIndex - 1]
          if (previousGift) {
            target.rowId = previousGift.id
            target.field = field
          }
        }
        break
      }

      case 'ArrowDown':
      case 'Enter': {
        e.preventDefault()
        if (currentRowIndex < sortedGifts.length - 1) {
          const nextGift = sortedGifts[currentRowIndex + 1]
          if (nextGift) {
            target.rowId = nextGift.id
            target.field = field
          }
        }
        break
      }

      case 'ArrowLeft': {
        const input = e.target as HTMLInputElement
        const shouldNavigate =
          input.type === 'date' || input.selectionStart === 0
        if (shouldNavigate) {
          e.preventDefault()
          target.rowId = rowId
          target.field = getLeftField(field)
        }
        break
      }

      case 'ArrowRight': {
        const input = e.target as HTMLInputElement
        const shouldNavigate =
          input.type === 'date' || input.selectionStart === input.value.length
        if (shouldNavigate) {
          e.preventDefault()
          target.rowId = rowId
          target.field = getRightField(field)
        }
        break
      }

      case 'Tab':
      default: {
        break
      }
    }

    focusTarget(target)
  }

  return {
    setInputRef,
    handleKeyDown,
  }
}
