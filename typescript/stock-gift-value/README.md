# Stock Gift Value Calculator

A single-page React web application that calculates the IRS-approved donated value of stock gifts using IRS guidelines.

## Overview

This application helps users calculate the value of stock donations according to IRS rules. The IRS specifies that the value of donated stock is calculated as the average of the high and low prices on the donation date.

**Formula**: `(High + Low) / 2 × Number of Shares`

## Features

- **Simple Input**: Enter donation date, ticker symbol, and number of shares
- **Immediate Calculation**: Value updates automatically as you type
- **Multiple Rows**: Add multiple stock gifts and calculate them all at once
- **Precision**: Maintains fractional cents to ensure accurate calculations
- **Smart Caching**: Historical stock data is cached to minimize API calls
- **Error Handling**: Clear error messages for invalid inputs or API failures
- **Responsive Design**: Clean, elegant UI that works on all screen sizes

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and dev server
- **Vitest** - Unit testing framework
- **Yahoo Finance API** - Historical stock price data
- **CSS Modules** - Component-scoped styling

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm

### Installation

```bash
cd typescript/stock-gift-value
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app in your browser.

### Build

```bash
npm run build
```

The build output will be in the `dist` directory.

### Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

## Usage

1. Enter the **date of the stock donation** (must be a past date)
2. Enter the **ticker symbol** (e.g., AAPL, BRK.B, MSFT)
3. Enter the **number of shares** donated
4. The **IRS-approved value** will be calculated and displayed automatically

Click **"+ Add Another Stock Gift"** to calculate multiple donations.

## Example

For the test case:
- Date: 11/7/2025
- Ticker: BRK.B
- Shares: 34
- High: $500.16, Low: $493.35
- **Calculated Value: $16,889.67**

The calculation: `(500.16 + 493.35) / 2 × 34 = 496.755 × 34 = $16,889.67`

## Project Structure

```
typescript/stock-gift-value/
├── src/
│   ├── components/          # React components
│   │   ├── StockGiftCalculator.tsx
│   │   ├── StockGiftRow.tsx
│   │   └── __tests__/       # Component tests
│   ├── services/            # API and caching
│   │   ├── stockApi.ts
│   │   ├── cache.ts
│   │   └── __tests__/
│   ├── utils/               # Helper functions
│   │   ├── calculations.ts
│   │   └── __tests__/
│   ├── types.ts             # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── public/
├── .github/workflows/       # CI/CD
├── package.json
├── tsconfig.json
├── vite.config.ts
├── SPEC.md                  # Design specification
└── README.md
```

## CI/CD

The project includes a GitHub Actions workflow that automatically:

1. Runs ESLint to check code quality
2. Checks Prettier formatting
3. Runs all unit tests
4. Builds the project

The workflow is triggered on pushes and pull requests that affect the `typescript/stock-gift-value` directory.

## IRS Guidelines

According to IRS guidelines, the fair market value of donated stock is determined by taking the mean between the highest and lowest quoted selling prices on the valuation date. This application implements this calculation precisely.

## License

This project is part of the ai-playground repository.

## Contributing

1. Ensure all tests pass: `npm test`
2. Ensure code is formatted: `npm run format`
3. Ensure linting passes: `npm run lint`
4. Build successfully: `npm run build`
