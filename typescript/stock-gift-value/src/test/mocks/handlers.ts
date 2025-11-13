import { http, HttpResponse } from 'msw'

/**
 * MSW handlers for mocking API requests in tests
 */
export const handlers = [
  // Mock the stock price API endpoint
  // Use wildcard to match any base URL (works in both browser and Node.js)
  http.get('*/api/stock-price', ({ request }) => {
    const url = new URL(request.url)
    const ticker = url.searchParams.get('ticker')
    const date = url.searchParams.get('date')

    // Handle BRK.B test case with specific date
    if (ticker === 'BRK.B' && date === '2025-11-07') {
      return HttpResponse.json({
        date: '2025-11-07',
        high: 500.16,
        low: 493.35,
        ticker: 'BRK.B',
      })
    }

    // Handle AAPL test case
    if (ticker === 'AAPL' && date === '2024-01-01') {
      return HttpResponse.json({
        date: '2024-01-01',
        high: 150,
        low: 140,
        ticker: 'AAPL',
      })
    }

    // Handle invalid ticker
    if (ticker === 'INVALID123') {
      return HttpResponse.json({ error: 'Invalid ticker' }, { status: 400 })
    }

    // Default mock response for other cases
    return HttpResponse.json({
      date: date || '2024-01-01',
      high: 100,
      low: 90,
      ticker: ticker || 'MOCK',
    })
  }),
]
