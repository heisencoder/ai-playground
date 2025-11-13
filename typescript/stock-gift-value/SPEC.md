# Stock Gift Value Calculator - Design Specification

## Overview
A single-page React web application to calculate the IRS-approved donated value of stock gifts. The application uses IRS guidelines which specify that stock gift value is calculated as the average of the high and low stock prices on the donation date.

## Requirements

### Functional Requirements

1. **Input Fields (per row)**
   - Date of stock donation (date picker)
   - Stock ticker symbol (text input)
   - Number of shares (numeric input)

2. **Output Field**
   - Automatically calculated IRS-approved value
   - Updates immediately when all three inputs are provided
   - Maintains fractional cents precision (e.g., $16,889.67)

3. **IRS Value Calculation**
   - Formula: `(High + Low) / 2 × Number of Shares`
   - Maintain precision throughout calculation:
     - Average price: 4 decimal places minimum
     - Final value: 2 decimal places (cents)

4. **Multi-row Support**
   - Allow users to add additional rows for multiple stock gifts
   - Each row calculates independently
   - Ability to remove rows

5. **Stock Price API**
   - Fetch historical stock data (high/low) for given date
   - Use Yahoo Finance API or similar free alternative
   - Implement caching to minimize API calls
   - Handle API errors gracefully

6. **User Experience**
   - Simple, elegant UI design
   - Responsive layout
   - Clear error messages
   - Loading states during API calls

### Non-Functional Requirements

1. **Testing**
   - Unit tests for calculation logic
   - Unit tests for API integration
   - Component tests for React UI
   - Required test case: Date: 11/7/2025, Ticker: BRK.B, Shares: 34, Expected Value: $16,889.67

2. **Code Quality**
   - ESLint for static analysis
   - Prettier for code formatting
   - TypeScript strict mode
   - All quality checks must pass

3. **CI/CD**
   - GitHub Actions workflow
   - Triggered on changes to `typescript/stock-gift-value/**`
   - Run tests
   - Run linting and formatting checks
   - Fail build if any checks fail

## Technical Architecture

### Technology Stack
- **Framework**: React 18+
- **Build Tool**: Vite
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest + React Testing Library
- **Code Quality**: ESLint + Prettier
- **API**: Yahoo Finance API (via npm package or direct fetch)
- **Styling**: CSS Modules or Tailwind CSS

### Project Structure
```
typescript/stock-gift-value/
├── src/
│   ├── components/
│   │   ├── StockGiftCalculator.tsx    # Main container component
│   │   ├── StockGiftRow.tsx           # Individual row component
│   │   └── __tests__/
│   │       ├── StockGiftCalculator.test.tsx
│   │       └── StockGiftRow.test.tsx
│   ├── services/
│   │   ├── stockApi.ts                # API integration
│   │   ├── cache.ts                   # Caching logic
│   │   └── __tests__/
│   │       └── stockApi.test.ts
│   ├── utils/
│   │   ├── calculations.ts            # IRS value calculation
│   │   └── __tests__/
│   │       └── calculations.test.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/
├── .github/
│   └── workflows/
│       └── stock-gift-value-ci.yml
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .eslintrc.json
├── .prettierrc
├── SPEC.md
└── README.md
```

### Data Models

```typescript
interface StockGift {
  id: string;
  date: string;          // ISO date format
  ticker: string;
  shares: number;
  value?: number;        // Calculated value
  loading?: boolean;
  error?: string;
}

interface StockPriceData {
  date: string;
  high: number;
  low: number;
  ticker: string;
}

interface CacheEntry {
  data: StockPriceData;
  timestamp: number;
}
```

### Core Algorithms

#### 1. IRS Value Calculation
```typescript
function calculateStockGiftValue(high: number, low: number, shares: number): number {
  const averagePrice = (high + low) / 2;
  const totalValue = averagePrice * shares;
  return Math.round(totalValue * 100) / 100; // Round to cents
}
```

#### 2. Caching Strategy
- Cache key: `${ticker}-${date}`
- Cache duration: 24 hours (historical data doesn't change)
- Storage: In-memory Map (can be upgraded to localStorage for persistence)
- Eviction: Time-based expiration

### API Integration

#### Yahoo Finance API Options
1. **npm package**: `yahoo-finance2` (recommended)
2. **Alternative**: Alpha Vantage API (free tier)
3. **Fallback**: Manual API calls to Yahoo Finance endpoint

### Error Handling
- Invalid ticker symbol → Display error message
- API rate limiting → Use cached data or display retry message
- Network errors → Display user-friendly error
- Invalid date (future/weekend) → Validate and show warning
- Missing data for date → Find nearest trading day

### UI/UX Design

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│          Stock Gift Value Calculator                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Date         Ticker    Shares        Value                  │
│  [________]   [____]    [____]        $________  [Remove]    │
│  [________]   [____]    [____]        $________  [Remove]    │
│                                                               │
│  [+ Add Another Stock Gift]                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Styling Guidelines
- Clean, minimal design
- Responsive grid layout
- Clear visual hierarchy
- Accessible color contrast
- Loading spinners for async operations
- Inline validation messages

## Implementation Plan

### Phase 1: Project Setup
1. Initialize Vite + React + TypeScript project
2. Configure ESLint and Prettier
3. Set up testing framework (Vitest)
4. Create basic project structure

### Phase 2: Core Functionality
1. Implement calculation utilities
2. Integrate stock price API
3. Implement caching mechanism
4. Write unit tests for utilities

### Phase 3: UI Components
1. Create StockGiftRow component
2. Create StockGiftCalculator container
3. Implement add/remove row functionality
4. Style components

### Phase 4: Testing
1. Write component tests
2. Write integration tests
3. Verify BRK.B test case passes
4. Ensure all tests pass

### Phase 5: CI/CD
1. Create GitHub Actions workflow
2. Configure test runner in CI
3. Configure linting/formatting checks
4. Test workflow execution

## Test Cases

### Unit Tests
1. **Calculation Logic**
   - Basic calculation: (100 + 90) / 2 * 10 = $950.00
   - Fractional cents: (248.46 + 248.82) / 2 * 34 = $16,889.67
   - Single share: Verify precision maintained
   - Large numbers: Test with millions of shares

2. **API Integration**
   - Successful data fetch
   - Cache hit scenario
   - Cache miss scenario
   - Error handling

3. **Components**
   - Render with initial data
   - Add new row
   - Remove row
   - Validation errors

### Integration Test
- **BRK.B Test Case**: Date: 11/7/2025, Ticker: BRK.B, Shares: 34, Expected: $16,889.67
  - This tests the full flow: API → Cache → Calculation → Display

## Success Criteria
- ✅ All unit tests pass
- ✅ BRK.B test case passes
- ✅ ESLint reports no errors
- ✅ Prettier formatting applied
- ✅ GitHub Actions workflow succeeds
- ✅ Application runs without console errors
- ✅ UI is responsive and elegant
- ✅ API caching works correctly

## Future Enhancements (Out of Scope)
- Total value across all gifts
- Export to CSV/PDF
- Historical donation tracking
- Support for mutual funds
- Tax deduction calculations
