import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StockGiftCalculator } from '../StockGiftCalculator'
import { stockPriceCache } from '../../services/cache'

// Test constants
const WAITFOR_TIMEOUT = 3000
const FIRST_ELEMENT_INDEX = 0

// Viewport dimensions
const MOBILE_WIDTH = 375
const MOBILE_HEIGHT = 667
const SMALL_MOBILE_WIDTH = 320
const SMALL_MOBILE_HEIGHT = 568
const TABLET_WIDTH = 768
const TABLET_HEIGHT = 1024
const DESKTOP_WIDTH = 1024
const DESKTOP_HEIGHT = 768
const EXPECTED_ONE_ROW = 1
const EXPECTED_TWO_ROWS = 2
const EXPECTED_THREE_ROWS = 3

// Helper to set viewport size
function setViewportSize(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  window.dispatchEvent(new Event('resize'))
}

describe('StockGiftCalculator - Mobile Rendering', () => {
  beforeEach(() => {
    stockPriceCache.clear()
    // Set mobile viewport (iPhone SE size)
    setViewportSize(MOBILE_WIDTH, MOBILE_HEIGHT)
  })

  afterEach(() => {
    // Reset to desktop viewport
    setViewportSize(DESKTOP_WIDTH, DESKTOP_HEIGHT)
  })

  it('should render correctly on mobile viewport', () => {
    render(<StockGiftCalculator />)

    expect(screen.getByText(/stock gift value calculator/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(1)
    expect(screen.getAllByLabelText(/^ticker$/i)).toHaveLength(1)
    expect(screen.getAllByLabelText(/^shares$/i)).toHaveLength(1)
  })

  it('should have the table container with horizontal scroll capability', () => {
    const { container } = render(<StockGiftCalculator />)

    const tableContainer = container.querySelector('.table-container')
    expect(tableContainer).toBeInTheDocument()

    if (tableContainer !== null) {
      const styles = window.getComputedStyle(tableContainer)
      expect(styles.overflowX).toBe('auto')
    }
  })

  it('should display full date format MM/DD/YYYY on mobile', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const dateInput = screen.getAllByLabelText(/^date$/i)[
      FIRST_ELEMENT_INDEX
    ] as HTMLInputElement

    // Type a full date
    await user.type(dateInput, '12/31/2024')

    // Verify the full date is stored
    expect(dateInput.value).toBe('12/31/2024')

    // Check that the input has enough width to display all 10 characters
    // by verifying the scrollWidth equals clientWidth (no overflow/clipping)
    const hasNoOverflow = dateInput.scrollWidth <= dateInput.clientWidth
    expect(hasNoOverflow).toBe(true)
  })

  it('should allow touch interactions on mobile', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const dateInput = screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]

    // Simulate touch interaction by clicking
    await user.click(dateInput)
    expect(dateInput).toHaveFocus()
  })

  it('should maintain functionality when adding rows on mobile', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const dateInput = screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]
    await user.type(dateInput, '2024-01-01')
    await user.tab()

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(
        EXPECTED_TWO_ROWS
      )
    })
  })

  it('should calculate values correctly on mobile', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const dateInput = screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]
    const tickerInput =
      screen.getAllByLabelText(/^ticker$/i)[FIRST_ELEMENT_INDEX]
    const sharesInput =
      screen.getAllByLabelText(/^shares$/i)[FIRST_ELEMENT_INDEX]

    await user.type(dateInput, '2024-01-01')
    await user.type(tickerInput, 'AAPL')
    await user.click(sharesInput)
    await user.keyboard('{Backspace}10')

    await waitFor(
      () => {
        expect(screen.getByText('$1,450.00')).toBeInTheDocument()
      },
      { timeout: WAITFOR_TIMEOUT }
    )
  })

  it('should show remove button and allow removal on mobile', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const dateInput = screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]
    await user.type(dateInput, '2024-01-01')
    await user.tab()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /remove/i })
      ).toBeInTheDocument()
    })

    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)

    // Should still have one row (the empty row)
    expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(EXPECTED_ONE_ROW)
  })

  it('should handle copy functionality on mobile', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const copyButton = screen.getByRole('button', {
      name: /copy all data to clipboard/i,
    })
    expect(copyButton).toBeInTheDocument()

    // Click should work (testing touch interaction)
    await user.click(copyButton)

    // Should show copy message (may have multiple due to mobile/desktop variants)
    await waitFor(() => {
      expect(screen.getAllByText(/copied/i).length).toBeGreaterThan(0)
    })
  })

  it('should have inputs with proper CSS classes for mobile styling', () => {
    const { container } = render(<StockGiftCalculator />)

    const inputs = container.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThan(0)

    // Verify inputs have the proper classes for mobile responsive styling
    const dateInputs = container.querySelectorAll('.date-input')
    const tickerInputs = container.querySelectorAll('.ticker-input')
    const sharesInputs = container.querySelectorAll('.shares-input')

    expect(dateInputs.length).toBeGreaterThan(0)
    expect(tickerInputs.length).toBeGreaterThan(0)
    expect(sharesInputs.length).toBeGreaterThan(0)
  })
})

describe('StockGiftCalculator - Very Small Mobile Screens', () => {
  beforeEach(() => {
    stockPriceCache.clear()
    // Set very small viewport (iPhone SE 1st gen size)
    setViewportSize(SMALL_MOBILE_WIDTH, SMALL_MOBILE_HEIGHT)
  })

  afterEach(() => {
    // Reset to desktop viewport
    setViewportSize(DESKTOP_WIDTH, DESKTOP_HEIGHT)
  })

  it('should render without layout issues on very small screens', () => {
    render(<StockGiftCalculator />)

    expect(screen.getByText(/stock gift value calculator/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(1)
  })

  it('should maintain input functionality on very small screens', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const tickerInput =
      screen.getAllByLabelText(/^ticker$/i)[FIRST_ELEMENT_INDEX]

    await user.type(tickerInput, 'AAPL')
    expect(tickerInput).toHaveValue('AAPL')
  })

  it('should handle data entry workflow on very small screens', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const dateInput = screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]
    const tickerInput =
      screen.getAllByLabelText(/^ticker$/i)[FIRST_ELEMENT_INDEX]
    const sharesInput =
      screen.getAllByLabelText(/^shares$/i)[FIRST_ELEMENT_INDEX]

    await user.type(dateInput, '2024-01-01')
    await user.type(tickerInput, 'AAPL')
    await user.click(sharesInput)
    await user.keyboard('{Backspace}10')

    await waitFor(
      () => {
        expect(screen.getByText('$1,450.00')).toBeInTheDocument()
      },
      { timeout: WAITFOR_TIMEOUT }
    )
  })
})

describe('StockGiftCalculator - Tablet Rendering', () => {
  beforeEach(() => {
    stockPriceCache.clear()
    // Set tablet viewport (iPad size)
    setViewportSize(TABLET_WIDTH, TABLET_HEIGHT)
  })

  afterEach(() => {
    // Reset to desktop viewport
    setViewportSize(DESKTOP_WIDTH, DESKTOP_HEIGHT)
  })

  it('should render correctly on tablet viewport', () => {
    render(<StockGiftCalculator />)

    expect(screen.getByText(/stock gift value calculator/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(1)
  })

  it('should handle full workflow on tablet', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const dateInput = screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]
    const tickerInput =
      screen.getAllByLabelText(/^ticker$/i)[FIRST_ELEMENT_INDEX]
    const sharesInput =
      screen.getAllByLabelText(/^shares$/i)[FIRST_ELEMENT_INDEX]

    await user.type(dateInput, '2024-01-01')
    await user.type(tickerInput, 'AAPL')
    await user.click(sharesInput)
    await user.keyboard('{Backspace}10')

    await waitFor(
      () => {
        expect(screen.getByText('$1,450.00')).toBeInTheDocument()
      },
      { timeout: WAITFOR_TIMEOUT }
    )
  })

  it('should support multi-row operations on tablet', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    // Add first row
    let dateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(dateInputs[FIRST_ELEMENT_INDEX], '2024-01-01')
    await user.tab()

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(
        EXPECTED_TWO_ROWS
      )
    })

    // Add second row
    dateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(dateInputs[1], '2024-02-01')
    await user.tab()

    // Verify both rows exist (plus empty row)
    expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(
      EXPECTED_THREE_ROWS
    )
  })
})

describe('StockGiftCalculator - Mobile Responsive CSS', () => {
  it('should have responsive CSS classes applied', () => {
    const { container } = render(<StockGiftCalculator />)

    // Verify the main container has the calculator-container class
    const calculatorContainer = container.querySelector('.calculator-container')
    expect(calculatorContainer).toBeInTheDocument()

    // Verify table container exists
    const tableContainer = container.querySelector('.table-container')
    expect(tableContainer).toBeInTheDocument()

    // Verify table has the correct class
    const table = container.querySelector('.stock-gift-table')
    expect(table).toBeInTheDocument()
  })
})
