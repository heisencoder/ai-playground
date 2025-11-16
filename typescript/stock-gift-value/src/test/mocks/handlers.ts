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

    // Handle AAPL test case for 2024-01-01
    if (ticker === 'AAPL' && date === '2024-01-01') {
      return HttpResponse.json({
        date: '2024-01-01',
        high: 150,
        low: 140,
        ticker: 'AAPL',
      })
    }

    // Handle AAPL test case for 2024-01-15 (for spreadsheet copy tests)
    // Average price: $14.50, 100 shares = $1,450.00
    if (ticker === 'AAPL' && date === '2024-01-15') {
      return HttpResponse.json({
        date: '2024-01-15',
        high: 15,
        low: 14,
        ticker: 'AAPL',
      })
    }

    // Handle GOOGL test case for 2024-02-20 (for spreadsheet copy tests)
    // Average price: $29.50, 50 shares = $1,475.00
    if (ticker === 'GOOGL' && date === '2024-02-20') {
      return HttpResponse.json({
        date: '2024-02-20',
        high: 30,
        low: 29,
        ticker: 'GOOGL',
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

  // Mock the ticker search API endpoint
  http.get('*/api/ticker-search', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')

    // Handle empty query
    if (!query) {
      return HttpResponse.json([])
    }

    // Normalize query for comparison
    const normalizedQuery = query.toLowerCase()

    // Mock responses for common queries
    if (
      normalizedQuery.startsWith('aapl') ||
      normalizedQuery.startsWith('app')
    ) {
      return HttpResponse.json([
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          exchange: 'NASDAQ',
          type: 'Equity',
        },
      ])
    }

    if (
      normalizedQuery.startsWith('goog') ||
      normalizedQuery.startsWith('alp')
    ) {
      return HttpResponse.json([
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc. Class A',
          exchange: 'NASDAQ',
          type: 'Equity',
        },
        {
          symbol: 'GOOG',
          name: 'Alphabet Inc. Class C',
          exchange: 'NASDAQ',
          type: 'Equity',
        },
      ])
    }

    if (
      normalizedQuery.startsWith('msft') ||
      normalizedQuery.startsWith('mic')
    ) {
      return HttpResponse.json([
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          exchange: 'NASDAQ',
          type: 'Equity',
        },
      ])
    }

    if (normalizedQuery.startsWith('brk')) {
      return HttpResponse.json([
        {
          symbol: 'BRK.B',
          name: 'Berkshire Hathaway Inc. Class B',
          exchange: 'NYSE',
          type: 'Equity',
        },
        {
          symbol: 'BRK.A',
          name: 'Berkshire Hathaway Inc. Class A',
          exchange: 'NYSE',
          type: 'Equity',
        },
      ])
    }

    // Return empty array for unknown queries
    return HttpResponse.json([])
  }),
]
