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
      expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(EXPECTED_TWO_ROWS)
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
      expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(EXPECTED_TWO_ROWS)
    })

    const updatedDateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(updatedDateInputs[1], '2024-02-01')
    await user.tab()

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[FIRST_ELEMENT_INDEX])

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(EXPECTED_TWO_ROWS)
      expect(screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]).toHaveValue('2024-02-01')
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
    const tickerInput = screen.getAllByLabelText(/^ticker$/i)[FIRST_ELEMENT_INDEX]
    const sharesInput = screen.getAllByLabelText(/^shares$/i)[FIRST_ELEMENT_INDEX]

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

  it('should handle BRK.B test case', async () => {
    const user = userEvent.setup()
    render(<StockGiftCalculator />)

    const dateInput = screen.getAllByLabelText(/^date$/i)[FIRST_ELEMENT_INDEX]
    const tickerInput = screen.getAllByLabelText(/^ticker$/i)[FIRST_ELEMENT_INDEX]
    const sharesInput = screen.getAllByLabelText(/^shares$/i)[FIRST_ELEMENT_INDEX]

    await user.type(dateInput, '2025-11-07')
    await user.type(tickerInput, 'BRK.B')
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
    const tickerInput = screen.getAllByLabelText(/^ticker$/i)[FIRST_ELEMENT_INDEX]
    const sharesInput = screen.getAllByLabelText(/^shares$/i)[FIRST_ELEMENT_INDEX]

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
    const tickerInput = screen.getAllByLabelText(/^ticker$/i)[FIRST_ELEMENT_INDEX]
    const sharesInput = screen.getAllByLabelText(/^shares$/i)[FIRST_ELEMENT_INDEX]

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
    const tickerInput = screen.getAllByLabelText(/^ticker$/i)[FIRST_ELEMENT_INDEX]
    const sharesInput = screen.getAllByLabelText(/^shares$/i)[FIRST_ELEMENT_INDEX]

    await user.type(dateInput, '2024-01-01')
    await user.type(tickerInput, 'AAPL')
    await user.click(sharesInput)
    await user.keyboard('{Backspace}10')
  })
})
