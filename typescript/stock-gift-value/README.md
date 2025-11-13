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
- **Vitest + MSW** - Unit testing with API mocking
- **Vercel** - Serverless deployment platform
- **Yahoo Finance API** - Historical stock price data (proxied through backend)
- **CSS Modules** - Component-scoped styling

## Architecture

This is a full-stack application with a **dual-mode backend** that works both locally and in production:

```
┌─────────────────────────────────────────┐
│         Frontend (React + Vite)         │
│  - User interface                       │
│  - Form validation                      │
│  - Client-side caching                  │
└─────────────┬───────────────────────────┘
              │
              │ HTTP Request
              ▼
┌─────────────────────────────────────────┐
│          Backend API Layer              │
│                                         │
│  Production: Vercel Serverless Function│
│  Local Dev:  Express Server             │
│                                         │
│  Both use shared handler.ts:            │
│  - Proxies to Yahoo Finance            │
│  - Handles CORS                         │
│  - Ticker normalization (BRK.B→BRK-B)  │
└─────────────┬───────────────────────────┘
              │
              │ External API Call
              ▼
┌─────────────────────────────────────────┐
│      Yahoo Finance API                  │
│  - Historical stock prices              │
│  - High/Low data for specific dates     │
└─────────────────────────────────────────┘
```

**Why a backend?**
- Yahoo Finance doesn't support CORS, so direct browser requests fail
- The serverless function acts as a proxy, solving the CORS issue
- API keys stay server-side (secure)
- Ticker symbol normalization (e.g., BRK.B → BRK-B for Yahoo Finance)

**Dual-mode architecture:**
- `api/handler.ts` - Shared business logic (platform-agnostic)
- `api/stock-price.ts` - Vercel serverless function wrapper (production)
- `api/dev-server.ts` - Express server wrapper (local development)
- Both adapters use the same handler logic, ensuring 100% code parity
- No Vercel dependency needed for local development or testing

## Getting Started

### Prerequisites

- **Node.js 22 or higher** (required for Vite 7+)
  - **Why Node.js 22?** Vite 7 requires Node.js 20.19+ or 22.12+ due to newer crypto APIs
  - Check your version: `node --version`
  - **Install Node.js 22** (see instructions below)
- npm 10 or higher

#### Installing Node.js 22

**Option 1: Using nvm (Recommended - works on macOS/Linux/WSL)**

nvm (Node Version Manager) allows you to install and switch between multiple Node.js versions easily.

```bash
# Install nvm (macOS/Linux/WSL)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Restart your terminal, then install Node.js 22
nvm install 22
nvm use 22

# Verify installation
node --version  # Should show v22.x.x
```

**Option 2: Using nvm-windows (Windows)**

```powershell
# Download and run the installer from:
# https://github.com/coreybutler/nvm-windows/releases

# After installation, restart terminal and run:
nvm install 22
nvm use 22
node --version  # Should show v22.x.x
```

**Option 3: Direct installation (all platforms)**

Download Node.js 22 LTS from [nodejs.org](https://nodejs.org/) and install it directly.

**Using this project's .nvmrc file:**

If you already have nvm installed, the project includes an `.nvmrc` file. Simply run:
```bash
nvm install  # Reads version from .nvmrc
nvm use      # Switches to the correct version
```

### Installation

```bash
cd typescript/stock-gift-value
npm install
```

### Development

This project supports **full-stack local development** without any external dependencies.

#### Option 1: Full-Stack Development (Recommended)

Run both the frontend and API server locally:

**Terminal 1 - Frontend:**
```bash
npm run dev
```
- Vite dev server runs on http://localhost:5173
- Frontend with hot module replacement

**Terminal 2 - API Server:**
```bash
npm run dev:api
```
- Express server runs on http://localhost:3001
- API endpoint: http://localhost:3001/api/stock-price
- Uses the same handler logic as production

**Configure the frontend to use local API:**
- In development, the frontend calls `/api/stock-price` (relative path)
- For local testing with the Express server, update the API URL to `http://localhost:3001/api/stock-price`
- Or use a proxy in `vite.config.ts` to forward `/api/*` requests to port 3001

**Test the API directly:**
```bash
# Health check
curl http://localhost:3001/health

# Stock price example
curl "http://localhost:3001/api/stock-price?ticker=AAPL&date=2024-01-01"
```

#### Option 2: Frontend-Only Development

For UI-only work without needing real API responses:

```bash
npm run dev
```
- Runs Vite dev server on http://localhost:5173
- Use MSW mocks for API responses (already configured in tests)
- Best for UI development and component testing

#### Option 3: Full-Stack with Vercel CLI (Optional)

If you prefer to test with Vercel's exact production environment:

```bash
# One-time setup: login to Vercel
vercel login

# Run Vercel development server
vercel dev
```
- Runs both frontend and serverless functions locally
- Mimics production environment exactly
- Requires Vercel account (free tier available)

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

## Deployment to Vercel

This application is designed to be deployed on Vercel's serverless platform. Vercel provides:
- Free hosting for the frontend
- Serverless functions for the backend API
- Automatic HTTPS
- CDN distribution
- Zero configuration deployment

### Prerequisites for Deployment

1. A [Vercel account](https://vercel.com/signup) (free tier available)
2. Git repository hosted on GitHub, GitLab, or Bitbucket

### Option 1: Deploy via Vercel Dashboard (Recommended for First-Time Setup)

1. **Connect your repository to Vercel:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New Project"
   - Import your Git repository
   - Select the repository containing this project

2. **Configure the project:**
   - **Framework Preset**: Vercel should auto-detect "Vite"
   - **Root Directory**: Set to `typescript/stock-gift-value` (if deploying from monorepo)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

3. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your application
   - You'll receive a production URL (e.g., `your-project.vercel.app`)

4. **Automatic deployments:**
   - Every push to your main branch will trigger a production deployment
   - Pull requests will get preview deployments automatically

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from project directory:**
   ```bash
   cd typescript/stock-gift-value
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy: Yes
   - Which scope: Select your account/team
   - Link to existing project: No (first time) or Yes (subsequent deploys)
   - Project name: Accept default or customize
   - Directory: `./` (current directory)
   - Override settings: No (unless needed)

5. **Deploy to production:**
   ```bash
   vercel --prod
   ```

### Option 3: Automatic Deployment via GitHub Actions

This project includes a GitHub Actions workflow that automatically deploys to Vercel when all tests pass.

1. **Get your Vercel credentials:**
   - Go to [Vercel Tokens](https://vercel.com/account/tokens)
   - Create a new token and copy it
   - In your project settings on Vercel, find your Project ID and Org ID

2. **Add secrets to GitHub:**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `VERCEL_TOKEN`: Your Vercel token
     - `VERCEL_ORG_ID`: Your Vercel organization ID
     - `VERCEL_PROJECT_ID`: Your Vercel project ID

3. **Push to your repository:**
   - GitHub Actions will automatically run tests
   - If tests pass, it will deploy to Vercel
   - You'll see the deployment URL in the Actions log

### Configuration Files

The project includes Vercel-specific configuration:

- **`vercel.json`**: Configures build settings and API routes
- **`.vercelignore`**: Excludes test files and development artifacts from deployment

### Environment Variables (if needed)

If you need to add environment variables:

1. **Via Vercel Dashboard:**
   - Go to your project → Settings → Environment Variables
   - Add variables for Production, Preview, and Development environments

2. **Via Vercel CLI:**
   ```bash
   vercel env add VARIABLE_NAME
   ```

### Testing Your Deployment

After deployment:

1. Visit your Vercel URL (e.g., `your-project.vercel.app`)
2. Test the calculator with a sample stock:
   - Date: Any past date
   - Ticker: AAPL or BRK.B
   - Shares: Any number
3. Verify the value is calculated correctly
4. Check browser console for any errors

### Troubleshooting Deployment

**Build fails:**
- Check that all dependencies are in `package.json`
- Verify `npm run build` works locally
- Check Vercel build logs for specific errors

**API endpoints return 404:**
- Ensure `vercel.json` is in the project root
- Verify `/api` directory exists with serverless functions
- Check that rewrites are configured correctly in `vercel.json`

**CORS errors:**
- The serverless function should handle CORS automatically
- Check that the frontend is calling `/api/stock-price` (relative path)
- Verify CORS headers are set in `/api/stock-price.ts`

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
├── api/                     # Backend API
│   ├── handler.ts           # Shared business logic (platform-agnostic)
│   ├── stock-price.ts       # Vercel serverless function wrapper
│   ├── dev-server.ts        # Express development server
│   └── __tests__/           # API handler tests
│       └── handler.test.ts
├── src/
│   ├── components/          # React components
│   │   ├── StockGiftCalculator.tsx
│   │   ├── StockGiftRow.tsx
│   │   └── __tests__/       # Component tests
│   ├── services/            # API and caching
│   │   ├── stockApi.ts
│   │   ├── cache.ts
│   │   └── __tests__/
│   ├── test/                # Test configuration
│   │   ├── setup.ts
│   │   └── mocks/           # MSW API mocks
│   ├── utils/               # Helper functions
│   │   ├── calculations.ts
│   │   └── __tests__/
│   ├── types.ts             # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── public/
├── .github/workflows/       # CI/CD
├── vercel.json              # Vercel configuration
├── .vercelignore            # Vercel ignore patterns
├── package.json
├── tsconfig.json
├── vite.config.ts
├── SPEC.md                  # Design specification
└── README.md
```

**Key architectural files:**
- `api/handler.ts` - Core API logic, fully testable without any platform dependencies
- `api/stock-price.ts` - Thin Vercel adapter (used in production)
- `api/dev-server.ts` - Thin Express adapter (used in local development)
- Both adapters call the same `handleStockPriceRequest()` function

## CI/CD

The project includes a GitHub Actions workflow that automatically:

1. Runs ESLint to check code quality
2. Checks Prettier formatting
3. Runs all unit tests
4. Builds the project
5. Deploys to Vercel (when all tests pass)

The workflow is triggered on pushes that affect the `typescript/stock-gift-value` directory. Successful builds are automatically deployed to Vercel's production environment.

## IRS Guidelines

According to IRS guidelines, the fair market value of donated stock is determined by taking the mean between the highest and lowest quoted selling prices on the valuation date. This application implements this calculation precisely.

## License

This project is part of the ai-playground repository.

## Contributing

1. Ensure all tests pass: `npm test`
2. Ensure code is formatted: `npm run format`
3. Ensure linting passes: `npm run lint`
4. Build successfully: `npm run build`
