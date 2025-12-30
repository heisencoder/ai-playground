import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StockGiftCalculator } from '../StockGiftCalculator'
import { stockPriceCache } from '../../services/cache'

// Test constants
const WAITFOR_TIMEOUT = 3000
const FIRST_ELEMENT_INDEX = 0
const EXPECTED_TWO_ROWS = 2

describe('StockGiftCalculator - Initial Render', () => {
  beforeEach(() => {
    stockPriceCache.clear()
  })

  it('should render with initial empty row', () => {
    render(<StockGiftCalculator />)

    expect(screen.getByText(/stock gift value calculator/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(1)
    expect(screen.getAllByLabelText(/^ticker$/i)).toHaveLength(1)
    expect(screen.getAllByLabelText(/^shares$/i)).toHaveLength(1)
  })
})

describe('StockGiftCalculator - Row Management', () => {
  beforeEach(() => {
    stockPriceCache.clear()
  })

  it('should add a new row when user types in empty row', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(1)

    const dateInput = screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]
    await user.type(dateInput, '2024-01-01')
    await user.tab()

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(
        EXPECTED_TWO_ROWS
      )
    })
  })

  it('should show remove button when row has data', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    expect(
      screen.queryByRole('button', { name: /remove/i })
    ).not.toBeInTheDocument()

    const dateInput = screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]
    await user.type(dateInput, '2024-01-01')
    await user.tab()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /remove/i })
      ).toBeInTheDocument()
    })
  })

  it('should remove a row when remove button is clicked', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const dateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(dateInputs[FIRST_ELEMENT_INDEX], '2024-01-01')
    await user.tab()

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(
        EXPECTED_TWO_ROWS
      )
    })

    const updatedDateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(updatedDateInputs[1], '2024-02-01')
    await user.tab()

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[FIRST_ELEMENT_INDEX])

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(
        EXPECTED_TWO_ROWS
      )
      expect(
        screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]
      ).toHaveValue('02/01/2024')
    })
  })
})

describe('StockGiftCalculator - Value Calculation', () => {
  beforeEach(() => {
    stockPriceCache.clear()
  })

  it('should calculate value when all fields are filled', async () => {
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

  it('should handle BRK-B test case', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const dateInput = screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]
    const tickerInput =
      screen.getAllByLabelText(/^ticker$/i)[FIRST_ELEMENT_INDEX]
    const sharesInput =
      screen.getAllByLabelText(/^shares$/i)[FIRST_ELEMENT_INDEX]

    await user.type(dateInput, '2025-11-07')
    await user.type(tickerInput, 'BRK-B')
    await user.click(sharesInput)
    await user.keyboard('{Backspace}34')

    await waitFor(
      () => {
        expect(screen.getByText('$16,889.67')).toBeInTheDocument()
      },
      { timeout: WAITFOR_TIMEOUT }
    )
  })
})

describe('StockGiftCalculator - Error Handling', () => {
  beforeEach(() => {
    stockPriceCache.clear()
  })

  it('should show error for invalid ticker', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const dateInput = screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]
    const tickerInput =
      screen.getAllByLabelText(/^ticker$/i)[FIRST_ELEMENT_INDEX]
    const sharesInput =
      screen.getAllByLabelText(/^shares$/i)[FIRST_ELEMENT_INDEX]

    await user.type(dateInput, '2024-01-01')
    await user.type(tickerInput, 'INVALID123')
    await user.click(sharesInput)
    await user.keyboard('{Backspace}10')

    await waitFor(
      () => {
        expect(screen.getByText(/invalid ticker/i)).toBeInTheDocument()
      },
      { timeout: WAITFOR_TIMEOUT }
    )
  })

  it('should show error for invalid ticker format', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const dateInput = screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]
    const tickerInput =
      screen.getAllByLabelText(/^ticker$/i)[FIRST_ELEMENT_INDEX]
    const sharesInput =
      screen.getAllByLabelText(/^shares$/i)[FIRST_ELEMENT_INDEX]

    await user.type(dateInput, '2024-01-01')
    await user.type(tickerInput, '123')
    await user.click(sharesInput)
    await user.keyboard('{Backspace}10')

    await waitFor(
      () => {
        expect(screen.getByText(/invalid ticker/i)).toBeInTheDocument()
      },
      { timeout: WAITFOR_TIMEOUT }
    )
  })

  it('should show loading state while fetching', async () => {
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
  })
})

describe('StockGiftCalculator - FMV Info Popup', () => {
  beforeEach(() => {
    stockPriceCache.clear()
  })

  it('should show info icon next to calculated value', async () => {
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

    // Info button should be visible
    expect(
      screen.getByRole('button', { name: /show fmv calculation/i })
    ).toBeInTheDocument()
  })

  it('should open FMV info popup when info icon is clicked', async () => {
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

    // Click the info button
    const infoButton = screen.getByRole('button', {
      name: /show fmv calculation/i,
    })
    await user.click(infoButton)

    // Popup should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('FMV Calculation')).toBeInTheDocument()
  })

  it('should display correct calculation details in popup', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const dateInput = screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]
    const tickerInput =
      screen.getAllByLabelText(/^ticker$/i)[FIRST_ELEMENT_INDEX]
    const sharesInput =
      screen.getAllByLabelText(/^shares$/i)[FIRST_ELEMENT_INDEX]

    // Use AAPL with mock data: high: 150, low: 140
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

    // Click the info button
    const infoButton = screen.getByRole('button', {
      name: /show fmv calculation/i,
    })
    await user.click(infoButton)

    // Verify calculation values (high: 150, low: 140, shares: 10)
    // Average: (150 + 140) / 2 = 145
    // Total: 145 * 10 = 1450
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('$150.00') // Day high
    expect(dialog).toHaveTextContent('$140.00') // Day low
    expect(dialog).toHaveTextContent('145.000') // Average
    expect(dialog).toHaveTextContent('$1,450.00') // Final value
  })

  it('should close popup when close button is clicked', async () => {
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

    // Open the popup
    const infoButton = screen.getByRole('button', {
      name: /show fmv calculation/i,
    })
    await user.click(infoButton)

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Close with close button
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    // Popup should be gone
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should close popup when clicking outside', async () => {
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

    // Open the popup
    const infoButton = screen.getByRole('button', {
      name: /show fmv calculation/i,
    })
    await user.click(infoButton)

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Wait for the click-outside listener to be attached
    await waitFor(() => {
      // Click outside (on the table header)
      const header = screen.getByText(/stock gift value calculator/i)
      header.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })

    // Popup should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('should not show info icon when no value is calculated', () => {
    render(<StockGiftCalculator />)

    // No value calculated yet, so no info button
    expect(
      screen.queryByRole('button', { name: /show fmv calculation/i })
    ).not.toBeInTheDocument()
  })
})
