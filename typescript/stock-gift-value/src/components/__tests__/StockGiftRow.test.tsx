import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StockGiftRow } from '../StockGiftRow'
import { StockGift } from '../../types'

describe('StockGiftRow', () => {
  const mockGift: StockGift = {
    id: 'test-1',
    date: '2024-01-01',
    ticker: 'AAPL',
    shares: 10,
  }

  it('should render all input fields', () => {
    const onUpdate = vi.fn()
    const onRemove = vi.fn()

    render(
      <StockGiftRow
        gift={mockGift}
        onUpdate={onUpdate}
        onRemove={onRemove}
        showRemove={true}
      />
    )

    expect(screen.getByLabelText(/^date$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^ticker$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^shares$/i)).toBeInTheDocument()
    expect(screen.getByText(/value/i)).toBeInTheDocument()
  })

  it('should display gift values correctly', () => {
    const onUpdate = vi.fn()
    const onRemove = vi.fn()

    render(
      <StockGiftRow
        gift={mockGift}
        onUpdate={onUpdate}
        onRemove={onRemove}
        showRemove={true}
      />
    )

    const dateInput = screen.getByLabelText(/^date$/i) as HTMLInputElement
    const tickerInput = screen.getByLabelText(/^ticker$/i) as HTMLInputElement
    const sharesInput = screen.getByLabelText(/^shares$/i) as HTMLInputElement

    expect(dateInput.value).toBe('2024-01-01')
    expect(tickerInput.value).toBe('AAPL')
    expect(sharesInput.value).toBe('10')
  })

  it('should call onUpdate when date changes', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    const onRemove = vi.fn()

    render(
      <StockGiftRow
        gift={mockGift}
        onUpdate={onUpdate}
        onRemove={onRemove}
        showRemove={true}
      />
    )

    const dateInput = screen.getByLabelText(/^date$/i)
    await user.clear(dateInput)

    // After clearing, onUpdate should have been called with empty date
    expect(onUpdate).toHaveBeenCalledWith('test-1', { date: '' })
  })

  it('should call onUpdate when ticker changes', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    const onRemove = vi.fn()

    render(
      <StockGiftRow
        gift={mockGift}
        onUpdate={onUpdate}
        onRemove={onRemove}
        showRemove={true}
      />
    )

    const tickerInput = screen.getByLabelText(/^ticker$/i)
    await user.clear(tickerInput)
    await user.type(tickerInput, 'MSFT')

    expect(onUpdate).toHaveBeenCalled()
  })

  it('should call onUpdate when shares change', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    const onRemove = vi.fn()

    render(
      <StockGiftRow
        gift={mockGift}
        onUpdate={onUpdate}
        onRemove={onRemove}
        showRemove={true}
      />
    )

    const sharesInput = screen.getByLabelText(/^shares$/i)
    await user.clear(sharesInput)
    await user.type(sharesInput, '20')

    expect(onUpdate).toHaveBeenCalled()
  })

  it('should display loading state', () => {
    const onUpdate = vi.fn()
    const onRemove = vi.fn()
    const loadingGift = { ...mockGift, loading: true }

    render(
      <StockGiftRow
        gift={loadingGift}
        onUpdate={onUpdate}
        onRemove={onRemove}
        showRemove={true}
      />
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display error state', () => {
    const onUpdate = vi.fn()
    const onRemove = vi.fn()
    const errorGift = { ...mockGift, error: 'Invalid ticker' }

    render(
      <StockGiftRow
        gift={errorGift}
        onUpdate={onUpdate}
        onRemove={onRemove}
        showRemove={true}
      />
    )

    expect(screen.getByText(/invalid ticker/i)).toBeInTheDocument()
  })

  it('should display calculated value', () => {
    const onUpdate = vi.fn()
    const onRemove = vi.fn()
    const valueGift = { ...mockGift, value: 1234.56 }

    render(
      <StockGiftRow
        gift={valueGift}
        onUpdate={onUpdate}
        onRemove={onRemove}
        showRemove={true}
      />
    )

    expect(screen.getByText('$1,234.56')).toBeInTheDocument()
  })

  it('should show remove button when showRemove is true', () => {
    const onUpdate = vi.fn()
    const onRemove = vi.fn()

    render(
      <StockGiftRow
        gift={mockGift}
        onUpdate={onUpdate}
        onRemove={onRemove}
        showRemove={true}
      />
    )

    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('should hide remove button when showRemove is false', () => {
    const onUpdate = vi.fn()
    const onRemove = vi.fn()

    render(
      <StockGiftRow
        gift={mockGift}
        onUpdate={onUpdate}
        onRemove={onRemove}
        showRemove={false}
      />
    )

    expect(
      screen.queryByRole('button', { name: /remove/i })
    ).not.toBeInTheDocument()
  })

  it('should call onRemove when remove button is clicked', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    const onRemove = vi.fn()

    render(
      <StockGiftRow
        gift={mockGift}
        onUpdate={onUpdate}
        onRemove={onRemove}
        showRemove={true}
      />
    )

    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)

    expect(onRemove).toHaveBeenCalledWith('test-1')
  })
})
