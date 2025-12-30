import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateInput } from '../DateInput'

describe('DateInput - Rendering', () => {
  it('should render with placeholder', () => {
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    expect(input).toHaveAttribute('placeholder', 'MM/DD/YYYY')
  })

  it('should display ISO date in MM/DD/YYYY format', () => {
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    render(
      <DateInput
        id="test-date"
        value="2024-01-15"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    expect(input).toHaveValue('01/15/2024')
  })

  it('should apply error class when hasError is true', () => {
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
        hasError={true}
        className="date-input"
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    expect(input).toHaveClass('date-input-error')
  })
})

describe('DateInput - Date Parsing', () => {
  it('should parse MM/DD/YYYY format on blur', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    await user.type(input, '01/15/2024')
    await user.tab() // Trigger blur

    expect(mockOnChange).toHaveBeenCalledWith('2024-01-15')
    expect(mockOnBlur).toHaveBeenCalled()
  })

  it('should parse M/D/YYYY format (single digit month/day)', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    await user.type(input, '1/5/2024')
    await user.tab()

    expect(mockOnChange).toHaveBeenCalledWith('2024-01-05')
  })

  it('should parse MM-DD-YYYY format with dashes', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    await user.type(input, '03-25-2024')
    await user.tab()

    expect(mockOnChange).toHaveBeenCalledWith('2024-03-25')
  })

  it('should parse MM/DD format and default to current year', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()
    const currentYear = new Date().getFullYear()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    await user.type(input, '06/15')
    await user.tab()

    expect(mockOnChange).toHaveBeenCalledWith(`${currentYear}-06-15`)
  })

  it('should parse MM-DD format and default to current year', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()
    const currentYear = new Date().getFullYear()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    await user.type(input, '06-15')
    await user.tab()

    expect(mockOnChange).toHaveBeenCalledWith(`${currentYear}-06-15`)
  })

  it('should parse YYYY/MM/DD format (ISO with slashes)', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    await user.type(input, '2024/03/25')
    await user.tab()

    expect(mockOnChange).toHaveBeenCalledWith('2024-03-25')
  })

  it('should keep ISO format unchanged', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    await user.type(input, '2024-03-25')
    await user.tab()

    expect(mockOnChange).toHaveBeenCalledWith('2024-03-25')
  })

  it('should handle empty input on blur', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    await user.click(input)
    await user.tab()

    expect(mockOnChange).toHaveBeenCalledWith('')
    expect(mockOnBlur).toHaveBeenCalled()
  })

  it('should use Date constructor fallback for natural language dates', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    await user.type(input, 'January 15, 2024')
    await user.tab()

    expect(mockOnChange).toHaveBeenCalledWith('2024-01-15')
  })

  it('should return invalid input unchanged when parsing fails', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    await user.type(input, 'not a date')
    await user.tab()

    expect(mockOnChange).toHaveBeenCalledWith('not a date')
  })
})

describe('DateInput - User Interaction', () => {
  it('should call onKeyDown when key is pressed', () => {
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()
    const mockOnKeyDown = vi.fn()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
        onKeyDown={mockOnKeyDown}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockOnKeyDown).toHaveBeenCalled()
  })

  it('should update display value when typing', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    await user.type(input, '01/15')

    expect(input).toHaveValue('01/15')
  })

  it('should update display when value prop changes', () => {
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    const { rerender } = render(
      <DateInput
        id="test-date"
        value="2024-01-15"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    expect(input).toHaveValue('01/15/2024')

    rerender(
      <DateInput
        id="test-date"
        value="2024-03-20"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    expect(input).toHaveValue('03/20/2024')
  })

  it('should work with inputRef', () => {
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()
    const mockInputRef = vi.fn()

    render(
      <DateInput
        id="test-date"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
        inputRef={mockInputRef}
      />
    )

    expect(mockInputRef).toHaveBeenCalled()
    expect(mockInputRef.mock.calls[0][0]).toBeInstanceOf(HTMLInputElement)
  })
})

describe('DateInput - Edge Cases', () => {
  it('should handle non-ISO format display value', () => {
    const mockOnChange = vi.fn()
    const mockOnBlur = vi.fn()

    render(
      <DateInput
        id="test-date"
        value="invalid-date"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    )

    const input = screen.getByRole('textbox', { name: /date/i })
    // Non-ISO format should be passed through unchanged
    expect(input).toHaveValue('invalid-date')
  })
})
