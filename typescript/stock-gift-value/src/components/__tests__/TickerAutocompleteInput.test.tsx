import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TickerAutocompleteInput } from '../TickerAutocompleteInput'
import { server } from '../../test/mocks/server'

const BLUR_DELAY_MS = 250

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

    // Wait a bit for blur delay
    await new Promise((resolve) => setTimeout(resolve, BLUR_DELAY_MS))

    expect(onBlur).toHaveBeenCalled()
  })
})
