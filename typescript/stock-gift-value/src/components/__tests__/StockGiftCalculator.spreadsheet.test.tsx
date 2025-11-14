import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StockGiftCalculator } from '../StockGiftCalculator'
import { stockPriceCache } from '../../services/cache'

describe('StockGiftCalculator - Spreadsheet Interface', () => {
  beforeEach(() => {
    stockPriceCache.clear()
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  describe('Grid Layout and Common Header', () => {
    it('should render as a table with semantic HTML', () => {
      render(<StockGiftCalculator />)

      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
    })

    it('should have a table header row with all column titles', () => {
      render(<StockGiftCalculator />)

      const table = screen.getByRole('table')
      const headers = within(table).getAllByRole('columnheader')

      expect(headers).toHaveLength(5) // Date, Ticker, Shares, Value, Actions
      expect(headers[0]).toHaveTextContent(/date/i)
      expect(headers[1]).toHaveTextContent(/ticker/i)
      expect(headers[2]).toHaveTextContent(/shares/i)
      expect(headers[3]).toHaveTextContent(/value/i)
    })

    it('should start with exactly one empty row', () => {
      render(<StockGiftCalculator />)

      const rows = screen.getAllByRole('row')
      // 1 header row + 1 data row
      expect(rows).toHaveLength(2)

      // Check that inputs are empty
      expect(screen.getByLabelText(/date/i)).toHaveValue('')
      expect(screen.getByLabelText(/ticker/i)).toHaveValue('')
      expect(screen.getByLabelText(/shares/i)).toHaveValue('')
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

      // Fill first row to trigger new row creation
      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[0], '2024-01-01')

      // Wait for new row to appear
      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        expect(rows).toHaveLength(3) // header + 2 data rows
      })
    })
  })

  describe('Column Sorting', () => {
    it('should have clickable column headers', () => {
      render(<StockGiftCalculator />)

      const table = screen.getByRole('table')
      const headers = within(table).getAllByRole('columnheader')

      // Date, Ticker, Shares, Value should be clickable
      expect(headers[0]).toHaveAttribute('type', 'button')
      expect(headers[1]).toHaveAttribute('type', 'button')
      expect(headers[2]).toHaveAttribute('type', 'button')
      expect(headers[3]).toHaveAttribute('type', 'button')
    })

    it('should display sort indicators on headers', () => {
      render(<StockGiftCalculator />)

      const table = screen.getByRole('table')
      const dateHeader = within(table).getByRole('columnheader', { name: /date/i })

      // Should show unsorted indicator initially
      expect(dateHeader).toHaveTextContent('↕')
    })

    it('should sort by date ascending when clicking date header', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create multiple rows with different dates
      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[0], '2024-03-15')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
      })

      const updatedDateInputs = screen.getAllByLabelText(/date/i)
      await user.type(updatedDateInputs[1], '2024-01-10')

      // Click date header to sort
      const dateHeader = screen.getByRole('columnheader', { name: /date/i })
      await user.click(dateHeader)

      // Check that dates are sorted ascending
      await waitFor(() => {
        const sortedDateInputs = screen.getAllByLabelText(/date/i)
        expect(sortedDateInputs[0]).toHaveValue('2024-01-10')
        expect(sortedDateInputs[1]).toHaveValue('2024-03-15')
      })

      // Should show ascending indicator
      expect(dateHeader).toHaveTextContent('↑')
    })

    it('should sort by date descending on second click', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create rows with dates
      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[0], '2024-03-15')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
      })

      const updatedDateInputs = screen.getAllByLabelText(/date/i)
      await user.type(updatedDateInputs[1], '2024-01-10')

      const dateHeader = screen.getByRole('columnheader', { name: /date/i })

      // First click: ascending
      await user.click(dateHeader)

      // Second click: descending
      await user.click(dateHeader)

      await waitFor(() => {
        const sortedDateInputs = screen.getAllByLabelText(/date/i)
        expect(sortedDateInputs[0]).toHaveValue('2024-03-15')
        expect(sortedDateInputs[1]).toHaveValue('2024-01-10')
      })

      expect(dateHeader).toHaveTextContent('↓')
    })

    it('should sort by ticker alphabetically', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create rows with tickers
      const tickerInputs = screen.getAllByLabelText(/ticker/i)
      await user.type(tickerInputs[0], 'TSLA')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/ticker/i)).toHaveLength(2)
      })

      const updatedTickerInputs = screen.getAllByLabelText(/ticker/i)
      await user.type(updatedTickerInputs[1], 'AAPL')

      // Click ticker header to sort
      const tickerHeader = screen.getByRole('columnheader', { name: /ticker/i })
      await user.click(tickerHeader)

      await waitFor(() => {
        const sortedTickerInputs = screen.getAllByLabelText(/ticker/i)
        expect(sortedTickerInputs[0]).toHaveValue('AAPL')
        expect(sortedTickerInputs[1]).toHaveValue('TSLA')
      })
    })

    it('should sort by shares numerically', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create rows with shares
      const sharesInputs = screen.getAllByLabelText(/shares/i)
      await user.type(sharesInputs[0], '100')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/shares/i)).toHaveLength(2)
      })

      const updatedSharesInputs = screen.getAllByLabelText(/shares/i)
      await user.type(updatedSharesInputs[1], '10')

      // Click shares header to sort
      const sharesHeader = screen.getByRole('columnheader', { name: /shares/i })
      await user.click(sharesHeader)

      await waitFor(() => {
        const sortedSharesInputs = screen.getAllByLabelText(/shares/i)
        expect(sortedSharesInputs[0]).toHaveValue('10')
        expect(sortedSharesInputs[1]).toHaveValue('100')
      })
    })

    it('should keep empty row at bottom when sorting', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create rows with data
      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[0], '2024-03-15')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
      })

      // Sort by date
      const dateHeader = screen.getByRole('columnheader', { name: /date/i })
      await user.click(dateHeader)

      // Last row should still be empty
      await waitFor(() => {
        const allDateInputs = screen.getAllByLabelText(/date/i)
        const lastInput = allDateInputs[allDateInputs.length - 1]
        expect(lastInput).toHaveValue('')
      })
    })
  })

  describe('Dynamic Row Management', () => {
    it('should add new empty row when user enters data in the last row', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Initially one row
      expect(screen.getAllByLabelText(/date/i)).toHaveLength(1)

      // Type in the date field
      const dateInput = screen.getByLabelText(/date/i)
      await user.type(dateInput, '2024-01-01')

      // Should create a new empty row
      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
      })

      // New row should be empty
      const dateInputs = screen.getAllByLabelText(/date/i)
      expect(dateInputs[1]).toHaveValue('')
    })

    it('should add new row when typing in ticker field of last row', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      const tickerInput = screen.getByLabelText(/ticker/i)
      await user.type(tickerInput, 'A')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/ticker/i)).toHaveLength(2)
      })
    })

    it('should add new row when typing in shares field of last row', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      const sharesInput = screen.getByLabelText(/shares/i)
      await user.type(sharesInput, '10')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/shares/i)).toHaveLength(2)
      })
    })

    it('should only create one new row per empty row', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      const dateInput = screen.getByLabelText(/date/i)
      await user.type(dateInput, '2024-01-01')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
      })

      // Continue typing in the same row
      const tickerInputs = screen.getAllByLabelText(/ticker/i)
      await user.type(tickerInputs[0], 'AAPL')

      // Should still be only 2 rows
      expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
    })

    it('should remove row when all fields are cleared', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create a row with data
      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[0], '2024-01-01')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
      })

      const tickerInputs = screen.getAllByLabelText(/ticker/i)
      await user.type(tickerInputs[0], 'AAPL')

      const sharesInputs = screen.getAllByLabelText(/shares/i)
      await user.type(sharesInputs[0], '10')

      // Clear all fields
      await user.clear(dateInputs[0])
      await user.clear(tickerInputs[0])
      await user.clear(sharesInputs[0])

      // Row should be removed, leaving only the empty row
      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(1)
      })
    })

    it('should never remove the last row', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Type and then clear in the only row
      const dateInput = screen.getByLabelText(/date/i)
      await user.type(dateInput, '2024-01-01')
      await user.clear(dateInput)

      // Should still have one row
      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(1)
      })
    })

    it('should maintain one empty row at all times', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create multiple rows
      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[0], '2024-01-01')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
      })

      const updatedDateInputs = screen.getAllByLabelText(/date/i)
      await user.type(updatedDateInputs[1], '2024-02-01')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(3)
      })

      // Last row should always be empty
      const allDateInputs = screen.getAllByLabelText(/date/i)
      expect(allDateInputs[allDateInputs.length - 1]).toHaveValue('')
    })

    it('should stop adding rows at 50-row limit', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create 49 rows (50th will be empty)
      for (let i = 0; i < 49; i++) {
        const dateInputs = screen.getAllByLabelText(/date/i)
        await user.type(dateInputs[dateInputs.length - 1], '2024-01-01')

        await waitFor(() => {
          expect(screen.getAllByLabelText(/date/i)).toHaveLength(i + 2)
        })
      }

      // Should have exactly 50 rows
      expect(screen.getAllByLabelText(/date/i)).toHaveLength(50)

      // Fill the 50th row
      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[49], '2024-01-01')

      // Should not create a 51st row
      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(50)
      }, { timeout: 1000 })
    })

    it('should add new empty row when at limit and a row is cleared', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create 50 rows
      for (let i = 0; i < 49; i++) {
        const dateInputs = screen.getAllByLabelText(/date/i)
        await user.type(dateInputs[dateInputs.length - 1], `2024-01-${String(i + 1).padStart(2, '0')}`)

        await waitFor(() => {
          expect(screen.getAllByLabelText(/date/i)).toHaveLength(i + 2)
        })
      }

      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[49], '2024-02-01')

      expect(screen.getAllByLabelText(/date/i)).toHaveLength(50)

      // Clear a row in the middle
      await user.clear(dateInputs[25])

      // Should now have 50 rows again (49 + 1 new empty)
      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(50)
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should move focus down with arrow down key', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create two rows
      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[0], '2024-01-01')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
      })

      // Focus first date input
      const updatedDateInputs = screen.getAllByLabelText(/date/i)
      updatedDateInputs[0].focus()

      // Press arrow down
      await user.keyboard('{ArrowDown}')

      // Focus should move to second date input
      expect(updatedDateInputs[1]).toHaveFocus()
    })

    it('should move focus up with arrow up key', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create two rows
      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[0], '2024-01-01')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
      })

      // Focus second date input
      const updatedDateInputs = screen.getAllByLabelText(/date/i)
      updatedDateInputs[1].focus()

      // Press arrow up
      await user.keyboard('{ArrowUp}')

      // Focus should move to first date input
      expect(updatedDateInputs[0]).toHaveFocus()
    })

    it('should move focus right with arrow right key', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      const dateInput = screen.getByLabelText(/date/i)
      const tickerInput = screen.getByLabelText(/ticker/i)

      dateInput.focus()

      // Press arrow right
      await user.keyboard('{ArrowRight}')

      // Focus should move to ticker input
      expect(tickerInput).toHaveFocus()
    })

    it('should move focus left with arrow left key', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      const dateInput = screen.getByLabelText(/date/i)
      const tickerInput = screen.getByLabelText(/ticker/i)

      tickerInput.focus()

      // Press arrow left
      await user.keyboard('{ArrowLeft}')

      // Focus should move to date input
      expect(dateInput).toHaveFocus()
    })

    it('should move focus to next cell with Tab key', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      const dateInput = screen.getByLabelText(/date/i)
      const tickerInput = screen.getByLabelText(/ticker/i)

      dateInput.focus()

      // Press Tab
      await user.keyboard('{Tab}')

      // Focus should move to ticker input
      expect(tickerInput).toHaveFocus()
    })

    it('should move focus to previous cell with Shift+Tab', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      const dateInput = screen.getByLabelText(/date/i)
      const sharesInput = screen.getByLabelText(/shares/i)

      sharesInput.focus()

      // Press Shift+Tab
      await user.keyboard('{Shift>}{Tab}{/Shift}')

      // Focus should move back through ticker to date
      // (depends on implementation)
      expect(dateInput).toHaveFocus()
    })

    it('should skip value column when navigating with arrows', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      const sharesInput = screen.getByLabelText(/shares/i)

      // Create a second row
      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[0], '2024-01-01')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
      })

      sharesInput.focus()

      // Press arrow right (should skip value and go to next row or do nothing)
      await user.keyboard('{ArrowRight}')

      // Focus should NOT be on a value display element
      // This test validates that we skip read-only columns
      const activeElement = document.activeElement
      expect(activeElement).not.toHaveAttribute('readonly')
    })

    it('should move focus down with Enter key', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create two rows
      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[0], '2024-01-01')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
      })

      const updatedDateInputs = screen.getAllByLabelText(/date/i)
      updatedDateInputs[0].focus()

      // Press Enter
      await user.keyboard('{Enter}')

      // Focus should move to date input in row below
      expect(updatedDateInputs[1]).toHaveFocus()
    })

    it('should not move focus beyond grid boundaries', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      const dateInput = screen.getByLabelText(/date/i)

      dateInput.focus()

      // Press arrow up (already at top)
      await user.keyboard('{ArrowUp}')

      // Focus should remain on same input
      expect(dateInput).toHaveFocus()

      // Press arrow left (already at left)
      await user.keyboard('{ArrowLeft}')

      // Focus should remain on same input
      expect(dateInput).toHaveFocus()
    })
  })

  describe('Copy to Spreadsheet', () => {
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

      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })

    it('should copy data in TSV format with headers', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create a row with data
      const dateInput = screen.getByLabelText(/date/i)
      const tickerInput = screen.getByLabelText(/ticker/i)
      const sharesInput = screen.getByLabelText(/shares/i)

      await user.type(dateInput, '2024-01-15')
      await user.type(tickerInput, 'AAPL')
      await user.type(sharesInput, '100')

      // Wait for value to calculate
      await waitFor(() => {
        expect(screen.getByText(/\$1,450\.00/)).toBeInTheDocument()
      }, { timeout: 3000 })

      const copyButton = screen.getByRole('button', {
        name: /copy all data to clipboard/i,
      })
      await user.click(copyButton)

      const expectedText = 'Date\tTicker\tShares\tValue\n2024-01-15\tAAPL\t100\t$1,450.00'

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedText)
    })

    it('should exclude empty rows from copy', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create one row with data, leaving second row empty
      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[0], '2024-01-15')

      const tickerInputs = screen.getAllByLabelText(/ticker/i)
      await user.type(tickerInputs[0], 'AAPL')

      const sharesInputs = screen.getAllByLabelText(/shares/i)
      await user.type(sharesInputs[0], '100')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
      })

      const copyButton = screen.getByRole('button', {
        name: /copy all data to clipboard/i,
      })
      await user.click(copyButton)

      // Should only copy the row with data, not the empty row
      const copiedText = (navigator.clipboard.writeText as any).mock.calls[0][0]
      const lines = copiedText.split('\n')

      expect(lines).toHaveLength(2) // Header + 1 data row
    })

    it('should show success message after copy', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      const copyButton = screen.getByRole('button', {
        name: /copy all data to clipboard/i,
      })
      await user.click(copyButton)

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument()
      })
    })

    it('should handle loading state in copied text', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Start entering data but don't wait for calculation
      const dateInput = screen.getByLabelText(/date/i)
      const tickerInput = screen.getByLabelText(/ticker/i)
      const sharesInput = screen.getByLabelText(/shares/i)

      await user.type(dateInput, '2024-01-15')
      await user.type(tickerInput, 'AAPL')
      await user.type(sharesInput, '100')

      // Copy immediately while still loading
      const copyButton = screen.getByRole('button', {
        name: /copy all data to clipboard/i,
      })
      await user.click(copyButton)

      const copiedText = (navigator.clipboard.writeText as any).mock.calls[0][0]

      // Should show "Loading..." for value
      expect(copiedText).toContain('Loading...')
    })

    it('should handle multiple rows in copied text', async () => {
      render(<StockGiftCalculator />)
      const user = userEvent.setup()

      // Create first row
      const dateInputs = screen.getAllByLabelText(/date/i)
      await user.type(dateInputs[0], '2024-01-15')

      await waitFor(() => {
        expect(screen.getAllByLabelText(/date/i)).toHaveLength(2)
      })

      // Create second row
      const updatedDateInputs = screen.getAllByLabelText(/date/i)
      await user.type(updatedDateInputs[1], '2024-02-20')

      const tickerInputs = screen.getAllByLabelText(/ticker/i)
      await user.type(tickerInputs[0], 'AAPL')
      await user.type(tickerInputs[1], 'GOOGL')

      const sharesInputs = screen.getAllByLabelText(/shares/i)
      await user.type(sharesInputs[0], '100')
      await user.type(sharesInputs[1], '50')

      // Wait for calculations
      await waitFor(() => {
        expect(screen.getByText(/\$1,450\.00/)).toBeInTheDocument()
      }, { timeout: 3000 })

      const copyButton = screen.getByRole('button', {
        name: /copy all data to clipboard/i,
      })
      await user.click(copyButton)

      const copiedText = (navigator.clipboard.writeText as any).mock.calls[0][0]
      const lines = copiedText.split('\n')

      expect(lines).toHaveLength(3) // Header + 2 data rows
    })
  })
})
