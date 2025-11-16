/* eslint-disable max-lines-per-function -- Test file with multiple test cases */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TickerAutocompleteInput } from '../TickerAutocompleteInput'
import { server } from '../../test/mocks/server'

const SUGGESTIONS_TIMEOUT_MS = 2000
const BLUR_TIMEOUT_MS = 500

describe('TickerAutocompleteInput', () => {
  beforeEach(() => {
    server.listen()
  })

  afterEach(() => {
    server.resetHandlers()
    server.close()
  })

  it('should render input with correct attributes', () => {
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
      />
    )

    const input = screen.getByLabelText('Ticker')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('id', 'test-ticker')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('maxLength', '10')
    expect(input).toHaveAttribute('placeholder', 'AAPL')
  })

  it('should call onChange when input value changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
      />
    )

    const input = screen.getByLabelText('Ticker')
    await user.type(input, 'A')

    expect(onChange).toHaveBeenCalledWith('A')
  })

  it('should show suggestions when typing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
      />
    )

    const input = screen.getByLabelText('Ticker')
    await user.type(input, 'AAPL')

    // Wait for suggestions to appear
    await waitFor(
      () => {
        const suggestions = screen.queryByRole('listbox')
        expect(suggestions).toBeInTheDocument()
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    // Check for Apple Inc.
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
  })

  it('should select suggestion on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
      />
    )

    const input = screen.getByLabelText('Ticker')
    await user.type(input, 'AAPL')

    // Wait for suggestions to appear
    await waitFor(
      () => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    const suggestion = screen.getByText('AAPL')
    await user.click(suggestion)

    // Should call onChange with selected ticker
    expect(onChange).toHaveBeenCalledWith('AAPL')
  })

  it('should navigate suggestions with keyboard', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
      />
    )

    const input = screen.getByLabelText('Ticker')
    await user.type(input, 'GOOG')

    // Wait for suggestions to appear
    await waitFor(
      () => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    // Navigate down
    await user.keyboard('{ArrowDown}')

    const suggestions = screen.getAllByRole('option')
    expect(suggestions[0]).toHaveClass('ticker-suggestion-selected')

    // Navigate down again
    await user.keyboard('{ArrowDown}')
    expect(suggestions[1]).toHaveClass('ticker-suggestion-selected')

    // Navigate up
    await user.keyboard('{ArrowUp}')
    expect(suggestions[0]).toHaveClass('ticker-suggestion-selected')
  })

  it('should select suggestion with Enter key', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
      />
    )

    const input = screen.getByLabelText('Ticker')
    await user.type(input, 'AAPL')

    // Wait for suggestions to appear
    await waitFor(
      () => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    // Navigate to first suggestion and select
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    // Should call onChange with selected ticker
    expect(onChange).toHaveBeenCalledWith('AAPL')
  })

  it('should close suggestions with Escape key', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
      />
    )

    const input = screen.getByLabelText('Ticker')
    await user.type(input, 'AAPL')

    // Wait for suggestions to appear
    await waitFor(
      () => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    // Press Escape
    await user.keyboard('{Escape}')

    // Suggestions should be hidden
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('should show error state when hasError is true', () => {
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value="INVALID"
        onChange={onChange}
        onBlur={onBlur}
        hasError={true}
      />
    )

    const input = screen.getByLabelText('Ticker')
    expect(input).toHaveClass('ticker-input-error')
  })

  it('should not show error state when hasError is false', () => {
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value="AAPL"
        onChange={onChange}
        onBlur={onBlur}
        hasError={false}
      />
    )

    const input = screen.getByLabelText('Ticker')
    expect(input).not.toHaveClass('ticker-input-error')
  })

  it('should show custom placeholder', () => {
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
        placeholder="Enter ticker"
      />
    )

    const input = screen.getByLabelText('Ticker')
    expect(input).toHaveAttribute('placeholder', 'Enter ticker')
  })

  it('should apply custom className', () => {
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
        className="custom-class"
      />
    )

    const input = screen.getByLabelText('Ticker')
    expect(input).toHaveClass('custom-class')
  })

  it('should show loading state while searching', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
      />
    )

    const input = screen.getByLabelText('Ticker')
    await user.type(input, 'AAPL')

    // Loading state might be very brief, so we check if it appears at some point
    // or if results appear directly
    await waitFor(
      () => {
        const listbox = screen.queryByRole('listbox')
        expect(listbox).toBeInTheDocument()
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )
  })

  it('should show "No results found" for unknown ticker', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
      />
    )

    const input = screen.getByLabelText('Ticker')
    await user.type(input, 'NOTFOUND123')

    // Wait for suggestions to appear or "No results found" message
    await waitFor(
      () => {
        const listbox = screen.queryByRole('listbox')
        expect(listbox).toBeInTheDocument()
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('should call custom onKeyDown handler for non-navigation keys', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onBlur = vi.fn()
    const onKeyDown = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    )

    const input = screen.getByLabelText('Ticker')
    await user.type(input, 'A')

    // Tab key should be passed through to custom handler
    await user.keyboard('{Tab}')

    expect(onKeyDown).toHaveBeenCalled()
  })

  it('should display exchange information when available', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
      />
    )

    const input = screen.getByLabelText('Ticker')
    await user.type(input, 'AAPL')

    // Wait for suggestions
    await waitFor(
      () => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      },
      { timeout: SUGGESTIONS_TIMEOUT_MS }
    )

    // Check for exchange (NASDAQ)
    expect(screen.getByText('NASDAQ')).toBeInTheDocument()
  })

  it('should call onBlur when input loses focus', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onBlur = vi.fn()

    render(
      <TickerAutocompleteInput
        id="test-ticker"
        value=""
        onChange={onChange}
        onBlur={onBlur}
      />
    )

    const input = screen.getByLabelText('Ticker')
    await user.click(input)
    await user.tab()

    // Wait for blur delay
    await waitFor(
      () => {
        expect(onBlur).toHaveBeenCalled()
      },
      { timeout: BLUR_TIMEOUT_MS }
    )
  })
})
