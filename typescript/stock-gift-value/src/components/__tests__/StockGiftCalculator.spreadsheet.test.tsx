import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StockGiftCalculator } from '../StockGiftCalculator'
import { stockPriceCache } from '../../services/cache'

// Test constants
const COLUMN_COUNT = 5
const EXPECTED_TWO_ROWS = 2
const EXPECTED_THREE_ROWS = 3
const WAITFOR_TIMEOUT_DEFAULT = 3000
const WAITFOR_TIMEOUT_LONG = 5000
const SLOW_TEST_TIMEOUT = 300000
const MAX_ROWS = 50
const ROWS_TO_CREATE = 49
const FIRST_ELEMENT = 0
const SECOND_ELEMENT = 1
const THIRD_ELEMENT = 2
const LAST_ELEMENT = 49
const EXPECTED_LINE_COUNT_WITH_HEADER = 2
const EXPECTED_THREE_LINES = 3

// Helper to get mock call argument
function getMockCallArg<T>(
  mock: ReturnType<typeof vi.fn>,
  callIndex: number = FIRST_ELEMENT,
  argIndex: number = FIRST_ELEMENT
): T {
  const calls = mock.mock.calls
  if (!calls[callIndex]) {
    throw new Error(`No call at index ${callIndex}`)
  }
  return calls[callIndex][argIndex] as T
}

// Helper to wait for expected row count
async function waitForRowCount(expectedCount: number): Promise<void> {
  await waitFor(() => {
    expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(expectedCount)
  })
}

// Helper to create a row with data
async function createRowWithDate(
  user: ReturnType<typeof userEvent.setup>,
  date: string,
  rowIndex: number = FIRST_ELEMENT
): Promise<void> {
  const dateInputs = screen.getAllByLabelText(/^date$/i)
  await user.type(dateInputs[rowIndex], date)
  act(() => dateInputs[rowIndex].blur())
  await user.tab()
}

// Setup clipboard mock
function setupClipboardMock(): ReturnType<typeof vi.fn> {
  const spy = vi.fn().mockResolvedValue(undefined)

  if (!navigator.clipboard) {
    Object.defineProperty(navigator, 'clipboard', {
      value: {},
      writable: true,
      configurable: true,
    })
  }

  Object.defineProperty(navigator.clipboard, 'writeText', {
    value: spy,
    writable: true,
    configurable: true,
  })

  return spy
}

describe('StockGiftCalculator - Grid Layout', () => {
  beforeEach(() => {
    stockPriceCache.clear()
    setupClipboardMock()
  })

  it('should render as a table with semantic HTML', () => {
    render(<StockGiftCalculator />)
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
  })

  it('should have a table header row with all column titles', () => {
    render(<StockGiftCalculator />)
    const table = screen.getByRole('table')
    const headers = within(table).getAllByRole('columnheader')

    expect(headers).toHaveLength(COLUMN_COUNT)
    expect(headers[FIRST_ELEMENT]).toHaveTextContent(/date/i)
    expect(headers[SECOND_ELEMENT]).toHaveTextContent(/ticker/i)
    expect(headers[THIRD_ELEMENT]).toHaveTextContent(/shares/i)
    expect(headers[THIRD_ELEMENT + 1]).toHaveTextContent(
      /fair market value|fmv/i
    )
  })

  it('should start with exactly one empty row', () => {
    render(<StockGiftCalculator />)
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(EXPECTED_TWO_ROWS)

    const dateInputs = screen.getAllByLabelText(/^date$/i)
    const tickerInputs = screen.getAllByLabelText(/^ticker$/i)
    const sharesInputs = screen.getAllByLabelText(/^shares$/i)

    expect(dateInputs).toHaveLength(1)
    expect(tickerInputs).toHaveLength(1)
    expect(sharesInputs).toHaveLength(1)

    expect(dateInputs[FIRST_ELEMENT]).toHaveValue('')
    expect(tickerInputs[FIRST_ELEMENT]).toHaveValue('')
    expect(sharesInputs[FIRST_ELEMENT]).toHaveValue(null)
  })

  it('should not show "Add Another Stock Gift" button', () => {
    render(<StockGiftCalculator />)
    expect(
      screen.queryByRole('button', { name: /add another stock gift/i })
    ).not.toBeInTheDocument()
  })

  it('should render multiple rows in correct order', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(dateInputs[FIRST_ELEMENT], '2024-01-01')
    await user.tab()

    await waitFor(() => {
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(EXPECTED_THREE_ROWS)
    })
  })
})

describe('StockGiftCalculator - Column Sorting', () => {
  beforeEach(() => {
    stockPriceCache.clear()
    setupClipboardMock()
  })

  it('should have clickable column headers', () => {
    render(<StockGiftCalculator />)
    const table = screen.getByRole('table')
    const headers = within(table).getAllByRole('columnheader')

    expect(
      within(headers[FIRST_ELEMENT]).getByRole('button')
    ).toBeInTheDocument()
    expect(
      within(headers[SECOND_ELEMENT]).getByRole('button')
    ).toBeInTheDocument()
    expect(
      within(headers[THIRD_ELEMENT]).getByRole('button')
    ).toBeInTheDocument()
    expect(
      within(headers[THIRD_ELEMENT + 1]).getByRole('button')
    ).toBeInTheDocument()
  })

  it('should display sort indicators on headers', () => {
    render(<StockGiftCalculator />)
    const table = screen.getByRole('table')
    const dateHeader = within(table).getByRole('columnheader', {
      name: /date/i,
    })
    expect(dateHeader).toHaveTextContent('↕')
  })

  it('should sort by date ascending when clicking date header', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(dateInputs[FIRST_ELEMENT], '2024-03-15')
    await user.tab()

    await waitForRowCount(EXPECTED_TWO_ROWS)

    const updatedDateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(updatedDateInputs[SECOND_ELEMENT], '2024-01-10')
    await user.tab()

    await waitForRowCount(EXPECTED_THREE_ROWS)

    const table = screen.getByRole('table')
    const headers = within(table).getAllByRole('columnheader')
    const dateButton = within(headers[FIRST_ELEMENT]).getByRole('button')
    await user.click(dateButton)

    const sortedDateInputs = screen.getAllByLabelText(/^date$/i)
    expect(sortedDateInputs[FIRST_ELEMENT]).toHaveValue('2024-01-10')
    expect(sortedDateInputs[SECOND_ELEMENT]).toHaveValue('2024-03-15')
    expect(sortedDateInputs[THIRD_ELEMENT]).toHaveValue('')
    expect(dateButton).toHaveTextContent('↑')
  })

  it('should sort by date descending on second click', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(dateInputs[FIRST_ELEMENT], '2024-03-15')
    await user.tab()

    await waitForRowCount(EXPECTED_TWO_ROWS)

    const updatedDateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(updatedDateInputs[SECOND_ELEMENT], '2024-01-10')
    await user.tab()

    await waitForRowCount(EXPECTED_THREE_ROWS)

    const table = screen.getByRole('table')
    const headers = within(table).getAllByRole('columnheader')
    const dateButton = within(headers[FIRST_ELEMENT]).getByRole('button')

    await user.click(dateButton)
    await user.click(dateButton)

    await waitFor(() => {
      const sortedDateInputs = screen.getAllByLabelText(/^date$/i)
      expect(sortedDateInputs[FIRST_ELEMENT]).toHaveValue('2024-03-15')
      expect(sortedDateInputs[SECOND_ELEMENT]).toHaveValue('2024-01-10')
    })

    expect(dateButton).toHaveTextContent('↓')
  })

  it('should sort by ticker alphabetically', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const tickerInputs = screen.getAllByLabelText(/^ticker$/i)
    await user.type(tickerInputs[FIRST_ELEMENT], 'TSLA')
    await user.tab()

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^ticker$/i)).toHaveLength(
        EXPECTED_TWO_ROWS
      )
    })

    const updatedTickerInputs = screen.getAllByLabelText(/^ticker$/i)
    await user.type(updatedTickerInputs[SECOND_ELEMENT], 'AAPL')
    await user.tab()

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^ticker$/i)).toHaveLength(
        EXPECTED_THREE_ROWS
      )
    })

    const table = screen.getByRole('table')
    const headers = within(table).getAllByRole('columnheader')
    const tickerButton = within(headers[SECOND_ELEMENT]).getByRole('button')
    await user.click(tickerButton)

    await waitFor(() => {
      const sortedTickerInputs = screen.getAllByLabelText(/^ticker$/i)
      expect(sortedTickerInputs[FIRST_ELEMENT]).toHaveValue('AAPL')
      expect(sortedTickerInputs[SECOND_ELEMENT]).toHaveValue('TSLA')
    })
  })

  it('should sort by shares numerically', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const sharesInputs = screen.getAllByLabelText(/^shares$/i)
    await user.type(sharesInputs[FIRST_ELEMENT], '100')
    await user.tab()

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^shares$/i)).toHaveLength(
        EXPECTED_TWO_ROWS
      )
    })

    const updatedSharesInputs = screen.getAllByLabelText(/^shares$/i)
    await user.type(updatedSharesInputs[SECOND_ELEMENT], '10')
    await user.tab()

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^shares$/i)).toHaveLength(
        EXPECTED_THREE_ROWS
      )
    })

    const table = screen.getByRole('table')
    const headers = within(table).getAllByRole('columnheader')
    const sharesButton = within(headers[THIRD_ELEMENT]).getByRole('button')
    await user.click(sharesButton)

    await waitFor(() => {
      const sortedSharesInputs = screen.getAllByLabelText(/^shares$/i)
      expect(sortedSharesInputs[FIRST_ELEMENT]).toHaveValue(10)
      expect(sortedSharesInputs[SECOND_ELEMENT]).toHaveValue(100)
    })
  })

  it('should sort by value column', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInputs = screen.getAllByLabelText(/^date$/i)
    const tickerInputs = screen.getAllByLabelText(/^ticker$/i)
    const sharesInputs = screen.getAllByLabelText(/^shares$/i)

    await user.type(dateInputs[FIRST_ELEMENT], '2024-01-15')
    await user.type(tickerInputs[FIRST_ELEMENT], 'AAPL')
    await user.type(sharesInputs[FIRST_ELEMENT], '100')
    await user.tab()

    await waitForRowCount(EXPECTED_TWO_ROWS)

    const updatedDateInputs = screen.getAllByLabelText(/^date$/i)
    const updatedTickerInputs = screen.getAllByLabelText(/^ticker$/i)
    const updatedSharesInputs = screen.getAllByLabelText(/^shares$/i)

    await user.type(updatedDateInputs[SECOND_ELEMENT], '2024-02-20')
    await user.type(updatedTickerInputs[SECOND_ELEMENT], 'GOOGL')
    await user.type(updatedSharesInputs[SECOND_ELEMENT], '50')
    await user.tab()

    await waitFor(
      () => {
        expect(screen.getByText('$1,450.00')).toBeInTheDocument()
        expect(screen.getByText('$1,475.00')).toBeInTheDocument()
      },
      { timeout: WAITFOR_TIMEOUT_LONG }
    )

    const table = screen.getByRole('table')
    const headers = within(table).getAllByRole('columnheader')
    const valueButton = within(headers[THIRD_ELEMENT + 1]).getByRole('button')
    await user.click(valueButton)

    await waitFor(() => {
      const rows = screen.getAllByRole('row')
      expect(
        within(rows[SECOND_ELEMENT]).getByLabelText(/^ticker$/i)
      ).toHaveValue('AAPL')
      expect(
        within(rows[THIRD_ELEMENT]).getByLabelText(/^ticker$/i)
      ).toHaveValue('GOOGL')
    })
  })

  it('should keep empty row at bottom when sorting', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(dateInputs[FIRST_ELEMENT], '2024-03-15')
    await user.tab()

    await waitForRowCount(EXPECTED_TWO_ROWS)

    const dateHeader = screen.getByRole('columnheader', { name: /date/i })
    await user.click(dateHeader)

    await waitFor(() => {
      const allDateInputs = screen.getAllByLabelText(/^date$/i)
      const lastInput = allDateInputs[allDateInputs.length - 1]
      expect(lastInput).toHaveValue('')
    })
  })
})

describe('StockGiftCalculator - Dynamic Row Management', () => {
  beforeEach(() => {
    stockPriceCache.clear()
    setupClipboardMock()
  })

  it('should add new empty row when user enters data in the last row', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(1)

    const dateInput = screen.getByLabelText(/^date$/i)
    await user.type(dateInput, '2024-01-01')
    await user.tab()

    await waitForRowCount(EXPECTED_TWO_ROWS)

    const dateInputs = screen.getAllByLabelText(/^date$/i)
    expect(dateInputs[SECOND_ELEMENT]).toHaveValue('')
  })

  it('should add new row when typing in ticker field of last row', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const tickerInput = screen.getByLabelText(/^ticker$/i)
    await user.type(tickerInput, 'A')
    await user.tab()

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^ticker$/i)).toHaveLength(
        EXPECTED_TWO_ROWS
      )
    })
  })

  it('should add new row when typing in shares field of last row', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const sharesInput = screen.getByLabelText(/^shares$/i)
    await user.type(sharesInput, '10')
    await user.tab()

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^shares$/i)).toHaveLength(
        EXPECTED_TWO_ROWS
      )
    })
  })

  it('should only create one new row per empty row', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInput = screen.getByLabelText(/^date$/i)
    await user.type(dateInput, '2024-01-01')

    const tickerInputs = screen.getAllByLabelText(/^ticker$/i)
    await user.type(tickerInputs[FIRST_ELEMENT], 'AAPL')
    await user.tab()

    await waitForRowCount(EXPECTED_TWO_ROWS)
  })

  it('should remove row when all fields are cleared', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(dateInputs[FIRST_ELEMENT], '2024-01-01')
    await user.tab()

    await waitForRowCount(EXPECTED_TWO_ROWS)

    const tickerInputs = screen.getAllByLabelText(/^ticker$/i)
    await user.type(tickerInputs[FIRST_ELEMENT], 'AAPL')

    const sharesInputs = screen.getAllByLabelText(/^shares$/i)
    await user.type(sharesInputs[FIRST_ELEMENT], '10')

    await user.clear(dateInputs[FIRST_ELEMENT])
    await user.clear(tickerInputs[FIRST_ELEMENT])
    await user.clear(sharesInputs[FIRST_ELEMENT])
    await user.tab()

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(1)
    })
  })

  it('should never remove the last row', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInput = screen.getByLabelText(/^date$/i)
    await user.type(dateInput, '2024-01-01')
    await user.clear(dateInput)
    await user.tab()

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(1)
    })
  })

  it('should maintain one empty row at all times', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(dateInputs[FIRST_ELEMENT], '2024-01-01')
    await user.tab()

    await waitForRowCount(EXPECTED_TWO_ROWS)

    const updatedDateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(updatedDateInputs[SECOND_ELEMENT], '2024-02-01')
    await user.tab()

    await waitForRowCount(EXPECTED_THREE_ROWS)

    const allDateInputs = screen.getAllByLabelText(/^date$/i)
    expect(allDateInputs[allDateInputs.length - 1]).toHaveValue('')
  })

  it(
    'should stop adding rows at 50-row limit',
    { timeout: SLOW_TEST_TIMEOUT },
    async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      for (let i = 0; i < ROWS_TO_CREATE; i++) {
        const dateInputs = screen.getAllByLabelText(/^date$/i)
        await user.type(dateInputs[dateInputs.length - 1], '2024-01-01')
        act(() => dateInputs[dateInputs.length - 1].blur())
        await user.tab()

        await waitFor(
          () => {
            expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(
              i + EXPECTED_TWO_ROWS
            )
          },
          { timeout: WAITFOR_TIMEOUT_LONG }
        )
      }

      expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(MAX_ROWS)

      const dateInputs = screen.getAllByLabelText(/^date$/i)
      await user.type(dateInputs[LAST_ELEMENT], '2024-01-01')
      act(() => dateInputs[LAST_ELEMENT].blur())
      await user.tab()

      await waitFor(
        () => {
          expect(screen.getAllByLabelText(/^date$/i)).toHaveLength(MAX_ROWS)
        },
        { timeout: WAITFOR_TIMEOUT_DEFAULT }
      )
    }
  )
})

describe('StockGiftCalculator - Keyboard Navigation', () => {
  beforeEach(() => {
    stockPriceCache.clear()
    setupClipboardMock()
  })

  it('should move focus down with arrow down key', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    await createRowWithDate(user, '2024-01-01')
    await waitForRowCount(EXPECTED_TWO_ROWS)

    const updatedDateInputs = screen.getAllByLabelText(/^date$/i)
    updatedDateInputs[FIRST_ELEMENT].focus()
    await user.keyboard('{ArrowDown}')

    expect(updatedDateInputs[SECOND_ELEMENT]).toHaveFocus()
  })

  it('should move focus up with arrow up key', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    await createRowWithDate(user, '2024-01-01')
    await waitForRowCount(EXPECTED_TWO_ROWS)

    const updatedDateInputs = screen.getAllByLabelText(/^date$/i)
    updatedDateInputs[SECOND_ELEMENT].focus()
    await user.keyboard('{ArrowUp}')

    expect(updatedDateInputs[FIRST_ELEMENT]).toHaveFocus()
  })

  it('should move focus right with arrow right key', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInput = screen.getByLabelText(/^date$/i)
    const tickerInput = screen.getByLabelText(/^ticker$/i)

    dateInput.focus()
    await user.keyboard('{ArrowRight}')

    expect(tickerInput).toHaveFocus()
  })

  it('should move focus left with arrow left key', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInput = screen.getByLabelText(/^date$/i)
    const tickerInput = screen.getByLabelText(/^ticker$/i)

    tickerInput.focus()
    await user.keyboard('{ArrowLeft}')

    expect(dateInput).toHaveFocus()
  })

  it('should move focus from ticker to shares with arrow right', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const tickerInput = screen.getByLabelText(/^ticker$/i)
    const sharesInput = screen.getByLabelText(/^shares$/i)

    tickerInput.focus()
    await user.keyboard('{ArrowRight}')

    expect(sharesInput).toHaveFocus()
  })

  it('should move focus to next cell with Tab key', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInput = screen.getByLabelText(/^date$/i)
    const tickerInput = screen.getByLabelText(/^ticker$/i)

    dateInput.focus()
    await user.keyboard('{Tab}')

    expect(tickerInput).toHaveFocus()
  })

  it('should move focus to previous cell with Shift+Tab', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const tickerInput = screen.getByLabelText(/^ticker$/i)
    const sharesInput = screen.getByLabelText(/^shares$/i)

    sharesInput.focus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')

    expect(tickerInput).toHaveFocus()
  })

  it('should skip value column when navigating with arrows', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const sharesInput = screen.getByLabelText(/^shares$/i)
    await createRowWithDate(user, '2024-01-01')
    await waitForRowCount(EXPECTED_TWO_ROWS)

    sharesInput.focus()
    await user.keyboard('{ArrowRight}')

    const activeElement = document.activeElement
    expect(activeElement).not.toHaveAttribute('readonly')
  })

  it('should move focus down with Enter key', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    await createRowWithDate(user, '2024-01-01')
    await waitForRowCount(EXPECTED_TWO_ROWS)

    const updatedDateInputs = screen.getAllByLabelText(/^date$/i)
    updatedDateInputs[FIRST_ELEMENT].focus()
    await user.keyboard('{Enter}')

    expect(updatedDateInputs[SECOND_ELEMENT]).toHaveFocus()
  })

  it('should not move focus beyond grid boundaries', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInput = screen.getByLabelText(/^date$/i)
    dateInput.focus()

    await user.keyboard('{ArrowUp}')
    expect(dateInput).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(dateInput).toHaveFocus()
  })
})

describe('StockGiftCalculator - Copy to Spreadsheet', () => {
  let clipboardWriteTextSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    stockPriceCache.clear()
    clipboardWriteTextSpy = setupClipboardMock()
  })

  it('should have a copy button in the interface', () => {
    render(<StockGiftCalculator />)
    const copyButton = screen.getByRole('button', {
      name: /copy all data to clipboard/i,
    })
    expect(copyButton).toBeInTheDocument()
  })

  it('should call clipboard API when copy button is clicked', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const copyButton = screen.getByRole('button', {
      name: /copy all data to clipboard/i,
    })
    await user.click(copyButton)

    expect(clipboardWriteTextSpy).toHaveBeenCalled()
  })

  it('should copy data in TSV format with headers', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInput = screen.getByLabelText(/^date$/i)
    const tickerInput = screen.getByLabelText(/^ticker$/i)
    const sharesInput = screen.getByLabelText(/^shares$/i)

    await user.type(dateInput, '2024-01-15')
    await user.type(tickerInput, 'AAPL')
    await user.type(sharesInput, '100')
    await user.tab()

    await waitFor(
      () => {
        expect(screen.getByText(/\$1,450\.00/)).toBeInTheDocument()
      },
      { timeout: WAITFOR_TIMEOUT_DEFAULT }
    )

    const copyButton = screen.getByRole('button', {
      name: /copy all data to clipboard/i,
    })
    await user.click(copyButton)

    const expectedText =
      'Date\tTicker\tShares\tValue\n2024-01-15\tAAPL\t100\t$1,450.00'
    expect(clipboardWriteTextSpy).toHaveBeenCalledWith(expectedText)
  })

  it('should exclude empty rows from copy', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(dateInputs[FIRST_ELEMENT], '2024-01-15')

    const tickerInputs = screen.getAllByLabelText(/^ticker$/i)
    await user.type(tickerInputs[FIRST_ELEMENT], 'AAPL')

    const sharesInputs = screen.getAllByLabelText(/^shares$/i)
    await user.type(sharesInputs[FIRST_ELEMENT], '100')
    await user.tab()

    await waitForRowCount(EXPECTED_TWO_ROWS)

    const copyButton = screen.getByRole('button', {
      name: /copy all data to clipboard/i,
    })
    await user.click(copyButton)

    const copiedText = getMockCallArg<string>(clipboardWriteTextSpy)
    const lines = copiedText.split('\n')

    expect(lines).toHaveLength(EXPECTED_LINE_COUNT_WITH_HEADER)
  })

  it('should show success message after copy', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const copyButton = screen.getByRole('button', {
      name: /copy all data to clipboard/i,
    })
    await user.click(copyButton)

    await waitFor(() => {
      // May have multiple copy messages due to mobile/desktop variants
      expect(screen.getAllByText(/copied/i).length).toBeGreaterThan(0)
    })
  })

  it('should handle loading state in copied text', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInput = screen.getByLabelText(/^date$/i)
    const sharesInput = screen.getByLabelText(/^shares$/i)

    await user.type(dateInput, '2024-01-15')
    await user.type(sharesInput, '100')
    await user.tab()

    const copyButton = screen.getByRole('button', {
      name: /copy all data to clipboard/i,
    })
    await user.click(copyButton)

    const copiedText = getMockCallArg<string>(clipboardWriteTextSpy)

    expect(copiedText).toContain('2024-01-15')
    expect(copiedText).toContain('100')
    const lines = copiedText.split('\n')
    expect(lines[SECOND_ELEMENT]).toMatch(/\t$/)
  })

  it('should handle multiple rows in copied text', async () => {
    render(<StockGiftCalculator />)
    const user = userEvent.setup()

    const dateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(dateInputs[FIRST_ELEMENT], '2024-01-15')
    await user.tab()

    await waitForRowCount(EXPECTED_TWO_ROWS)

    const updatedDateInputs = screen.getAllByLabelText(/^date$/i)
    await user.type(updatedDateInputs[SECOND_ELEMENT], '2024-02-20')
    await user.tab()

    const tickerInputs = screen.getAllByLabelText(/^ticker$/i)
    await user.type(tickerInputs[FIRST_ELEMENT], 'AAPL')
    await user.type(tickerInputs[SECOND_ELEMENT], 'GOOGL')

    const sharesInputs = screen.getAllByLabelText(/^shares$/i)
    await user.type(sharesInputs[FIRST_ELEMENT], '100')
    await user.type(sharesInputs[SECOND_ELEMENT], '50')

    await waitFor(
      () => {
        expect(screen.getByText(/\$1,450\.00/)).toBeInTheDocument()
      },
      { timeout: WAITFOR_TIMEOUT_DEFAULT }
    )

    const copyButton = screen.getByRole('button', {
      name: /copy all data to clipboard/i,
    })
    await user.click(copyButton)

    const copiedText = getMockCallArg<string>(clipboardWriteTextSpy)
    const lines = copiedText.split('\n')

    expect(lines).toHaveLength(EXPECTED_THREE_LINES)
  })
})
