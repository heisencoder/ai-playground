import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StockGiftRow } from '../StockGiftRow'
import { StockGift } from '../../types'

// Test constants
const TEST_ID = 'test-1'
const TEST_DATE = '2024-01-01'
const TEST_TICKER = 'AAPL'
const TEST_SHARES = 10
const TEST_VALUE = 1234.56
const NEW_SHARES = 20

const mockGift: StockGift = {
  id: TEST_ID,
  date: TEST_DATE,
  ticker: TEST_TICKER,
  shares: TEST_SHARES,
}

interface RenderStockGiftRowOptions {
  gift?: StockGift
  showRemove?: boolean
}

function renderStockGiftRow(options: RenderStockGiftRowOptions = {}): {
  onUpdate: ReturnType<typeof vi.fn>
  onRemove: ReturnType<typeof vi.fn>
} {
  const { gift = mockGift, showRemove = true } = options
  const onUpdate = vi.fn()
  const onRemove = vi.fn()

  render(
    <StockGiftRow
      gift={gift}
      onUpdate={onUpdate}
      onRemove={onRemove}
      showRemove={showRemove}
    />
  )

  return { onUpdate, onRemove }
}

describe('StockGiftRow - Rendering', () => {
  it('should render all input fields', () => {
    renderStockGiftRow()

    expect(screen.getByLabelText(/^date$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^ticker$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^shares$/i)).toBeInTheDocument()
    expect(screen.getByText(/value/i)).toBeInTheDocument()
  })

  it('should display gift values correctly', () => {
    renderStockGiftRow()

    const dateInput = screen.getByLabelText(/^date$/i)
    const tickerInput = screen.getByLabelText(/^ticker$/i)
    const sharesInput = screen.getByLabelText(/^shares$/i)

    expect(dateInput).toHaveValue(TEST_DATE)
    expect(tickerInput).toHaveValue(TEST_TICKER)
    expect(sharesInput).toHaveValue(TEST_SHARES)
  })

  it('should display loading state', () => {
    const loadingGift = { ...mockGift, loading: true }
    renderStockGiftRow({ gift: loadingGift })

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display error state', () => {
    const errorGift = { ...mockGift, error: 'Invalid ticker' }
    renderStockGiftRow({ gift: errorGift })

    expect(screen.getByText(/invalid ticker/i)).toBeInTheDocument()
  })

  it('should display calculated value', () => {
    const valueGift = { ...mockGift, value: TEST_VALUE }
    renderStockGiftRow({ gift: valueGift })

    expect(screen.getByText('$1,234.56')).toBeInTheDocument()
  })
})

describe('StockGiftRow - User Interactions', () => {
  it('should call onUpdate when date changes', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderStockGiftRow()

    const dateInput = screen.getByLabelText(/^date$/i)
    await user.clear(dateInput)

    expect(onUpdate).toHaveBeenCalledWith(TEST_ID, { date: '' })
  })

  it('should call onUpdate when ticker changes', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderStockGiftRow()

    const tickerInput = screen.getByLabelText(/^ticker$/i)
    await user.clear(tickerInput)
    await user.type(tickerInput, 'MSFT')

    expect(onUpdate).toHaveBeenCalled()
  })

  it('should call onUpdate when shares change', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderStockGiftRow()

    const sharesInput = screen.getByLabelText(/^shares$/i)
    await user.clear(sharesInput)
    await user.type(sharesInput, NEW_SHARES.toString())

    expect(onUpdate).toHaveBeenCalled()
  })
})

describe('StockGiftRow - Remove Button', () => {
  it('should show remove button when showRemove is true', () => {
    renderStockGiftRow({ showRemove: true })

    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('should hide remove button when showRemove is false', () => {
    renderStockGiftRow({ showRemove: false })

    expect(
      screen.queryByRole('button', { name: /remove/i })
    ).not.toBeInTheDocument()
  })

  it('should call onRemove when remove button is clicked', async () => {
    const user = userEvent.setup()
    const { onRemove } = renderStockGiftRow()

    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)

    expect(onRemove).toHaveBeenCalledWith(TEST_ID)
  })
})
