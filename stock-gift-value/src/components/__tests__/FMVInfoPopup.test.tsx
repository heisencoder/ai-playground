import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FMVInfoPopup } from '../FMVInfoPopup'
import { getFMVCalculationDetails } from '../../utils/calculations'

// Test constants
const BRK_B_HIGH = 500.16
const BRK_B_LOW = 493.35
const BRK_B_SHARES = 34

const COWZ_HIGH = 61.56999969482422
const COWZ_LOW = 61.13399887084961
const COWZ_SHARES = 53
const COWZ_ROUNDED_HIGH = 61.57
const COWZ_ROUNDED_LOW = 61.13
const COWZ_EXPECTED_FMV = '$3,251.55'

const SIMPLE_HIGH = 100
const SIMPLE_LOW = 90
const SIMPLE_SHARES = 10

describe('FMVInfoPopup - Rendering', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('should render all calculation details correctly', () => {
    // Use BRK-B case which tests 3 decimal precision
    const details = getFMVCalculationDetails(
      BRK_B_HIGH,
      BRK_B_LOW,
      BRK_B_SHARES
    )

    render(
      <FMVInfoPopup
        highPrice={BRK_B_HIGH}
        lowPrice={BRK_B_LOW}
        shares={BRK_B_SHARES}
        onClose={mockOnClose}
      />
    )

    const dialog = screen.getByRole('dialog')

    // Title
    expect(screen.getByText('FMV Calculation')).toBeInTheDocument()

    // High/low rounded to 2 decimal places
    expect(
      screen.getByText(`$${details.roundedHigh.toFixed(2)}`)
    ).toBeInTheDocument()
    expect(
      screen.getByText(`$${details.roundedLow.toFixed(2)}`)
    ).toBeInTheDocument()

    // Average with 3 decimal places (496.755)
    expect(dialog).toHaveTextContent('496.755')

    // Total before rounding with 3 decimal places
    expect(screen.getByText(/16889\.670/)).toBeInTheDocument()

    // Final value formatted as currency
    expect(screen.getByText('$16,889.67')).toBeInTheDocument()
  })

  it('should display rounded values from raw API prices (not raw values)', () => {
    render(
      <FMVInfoPopup
        highPrice={COWZ_HIGH}
        lowPrice={COWZ_LOW}
        shares={COWZ_SHARES}
        onClose={mockOnClose}
      />
    )

    // COWZ high: 61.56999969482422 -> 61.57
    // COWZ low: 61.13399887084961 -> 61.13
    expect(
      screen.getByText(`$${COWZ_ROUNDED_HIGH.toFixed(2)}`)
    ).toBeInTheDocument()
    expect(
      screen.getByText(`$${COWZ_ROUNDED_LOW.toFixed(2)}`)
    ).toBeInTheDocument()
    expect(screen.getByText(COWZ_EXPECTED_FMV)).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(
      <FMVInfoPopup
        highPrice={SIMPLE_HIGH}
        lowPrice={SIMPLE_LOW}
        shares={SIMPLE_SHARES}
        onClose={mockOnClose}
      />
    )

    expect(
      screen.getByRole('dialog', { name: /fair market value calculation/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })
})

describe('FMVInfoPopup - Close Button', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <FMVInfoPopup
        highPrice={SIMPLE_HIGH}
        lowPrice={SIMPLE_LOW}
        shares={SIMPLE_SHARES}
        onClose={mockOnClose}
      />
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})

describe('FMVInfoPopup - Click Outside Dismissal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should call onClose when clicking outside the popup', async () => {
    render(
      <div>
        <div data-testid="outside-element">Outside content</div>
        <FMVInfoPopup
          highPrice={SIMPLE_HIGH}
          lowPrice={SIMPLE_LOW}
          shares={SIMPLE_SHARES}
          onClose={mockOnClose}
        />
      </div>
    )

    // Advance past the setTimeout that adds the event listener
    await vi.advanceTimersByTimeAsync(1)

    const outsideElement = screen.getByTestId('outside-element')
    fireEvent.mouseDown(outsideElement)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should not call onClose when clicking inside the popup', async () => {
    render(
      <FMVInfoPopup
        highPrice={SIMPLE_HIGH}
        lowPrice={SIMPLE_LOW}
        shares={SIMPLE_SHARES}
        onClose={mockOnClose}
      />
    )

    // Advance past the setTimeout that adds the event listener
    await vi.advanceTimersByTimeAsync(1)

    const popup = screen.getByRole('dialog')
    fireEvent.mouseDown(popup)

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('should not immediately dismiss on the click that opens it', () => {
    render(
      <FMVInfoPopup
        highPrice={SIMPLE_HIGH}
        lowPrice={SIMPLE_LOW}
        shares={SIMPLE_SHARES}
        onClose={mockOnClose}
      />
    )

    // Before the setTimeout, clicking outside should not trigger close
    fireEvent.mouseDown(document.body)

    // Should not have been called because event listener not added yet
    expect(mockOnClose).not.toHaveBeenCalled()
  })
})

describe('FMVInfoPopup - Escape Key Dismissal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('should call onClose when Escape key is pressed', () => {
    render(
      <FMVInfoPopup
        highPrice={SIMPLE_HIGH}
        lowPrice={SIMPLE_LOW}
        shares={SIMPLE_SHARES}
        onClose={mockOnClose}
      />
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should not call onClose for other keys', () => {
    render(
      <FMVInfoPopup
        highPrice={SIMPLE_HIGH}
        lowPrice={SIMPLE_LOW}
        shares={SIMPLE_SHARES}
        onClose={mockOnClose}
      />
    )

    fireEvent.keyDown(document, { key: 'Enter' })
    fireEvent.keyDown(document, { key: 'a' })
    fireEvent.keyDown(document, { key: 'Tab' })

    expect(mockOnClose).not.toHaveBeenCalled()
  })
})

describe('FMVInfoPopup - Half-Penny Display', () => {
  const mockOnClose = vi.fn()

  it('should display half-penny precision in average when high+low sum is odd', () => {
    // Test case: 10.01 + 10.00 = 20.01 / 2 = 10.005 (half-penny)
    const HIGH = 10.006 // rounds to 10.01
    const LOW = 10.004 // rounds to 10.00
    const SHARES = 100

    render(
      <FMVInfoPopup
        highPrice={HIGH}
        lowPrice={LOW}
        shares={SHARES}
        onClose={mockOnClose}
      />
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('10.005') // average with half-penny
    expect(dialog).toHaveTextContent('1000.500') // total before rounding
    expect(dialog).toHaveTextContent('$1,000.50') // final value
  })
})
