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
- **Express** - Node.js web server for API and static file serving
- **Yahoo Finance API** - Historical stock price data (proxied through backend)
- **CSS Modules** - Component-scoped styling

## Architecture

This is a full-stack application with an **Express backend** that serves both API endpoints and static files:

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
│       Express Server (Node.js)          │
│                                         │
│  - Serves static frontend files         │
│  - API endpoints                        │
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
- The Express server acts as a proxy, solving the CORS issue
- API keys stay server-side (secure)
- Ticker symbol normalization (e.g., BRK.B → BRK-B for Yahoo Finance)

**Clean architecture:**
- `api/handler.ts` - Core business logic (platform-agnostic, fully testable)
- `api/server.ts` - Express server that uses the handler and serves static files
- Handler logic is separated from server concerns for easy testing

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

This project supports **full-stack local development** with hot reload for both frontend and backend.

#### Running in Development Mode

You'll need two terminal windows:

**Terminal 1 - Frontend (Vite dev server):**
```bash
npm run dev
```
- Runs on http://localhost:5173
- Hot module replacement for instant updates
- Proxies API requests to the backend server

**Terminal 2 - Backend API Server:**
```bash
npm run dev:api
```
- Express server runs on http://localhost:3001
- API endpoint: http://localhost:3001/api/stock-price
- Health check: http://localhost:3001/health
- Automatically reloads on code changes

**Test the API directly:**
```bash
# Health check
curl http://localhost:3001/health

# Stock price example
curl "http://localhost:3001/api/stock-price?ticker=AAPL&date=2024-01-01"
```

The frontend development server (Vite) is configured to proxy `/api/*` requests to the Express server on port 3001, so you can develop both frontend and backend simultaneously.

### Production Build

Build both the frontend and server:

```bash
npm run build:all
```

This runs:
1. `npm run build` - Compiles the React frontend to `dist/`
2. `npm run build:server` - Compiles the Express server to `dist-server/`

Or build them separately:
```bash
npm run build         # Build frontend only
npm run build:server  # Build server only
```

### Running in Production

After building, start the production server:

```bash
npm start
```

This runs the Express server in production mode, which:
- Serves the built frontend from `dist/`
- Provides API endpoints
- Handles client-side routing (SPA fallback)
- Runs on port 3001 by default (configurable via `PORT` environment variable)

**Environment Variables:**

Create a `.env` file for production configuration:
```bash
PORT=3001
NODE_ENV=production
```

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

## Deployment

This application is a standard Node.js Express app that can be deployed to any platform that supports Node.js.

### Deployment Options

**Cloud Platforms:**
- **Google Cloud Platform** (App Engine, Cloud Run, Compute Engine)
- **AWS** (Elastic Beanstalk, EC2, ECS)
- **Azure** (App Service, Container Instances)
- **DigitalOcean** (App Platform, Droplets)
- **Heroku** (Dynos)
- **Railway** (https://railway.app)
- **Render** (https://render.com)
- **Fly.io** (https://fly.io)

### General Deployment Steps

1. **Build the application:**
   ```bash
   npm run build:all
   ```

2. **Set environment variables:**
   ```bash
   NODE_ENV=production
   PORT=3001  # or whatever port your platform uses
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

### Example: Deploying to Railway

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Deploy: `railway up`

Railway will automatically:
- Detect Node.js
- Run `npm install`
- Run `npm run build:all`
- Start the server with `npm start`

### Example: Deploying to Render

1. Create a `render.yaml` file:
   ```yaml
   services:
     - type: web
       name: stock-gift-value
       env: node
       buildCommand: npm install && npm run build:all
       startCommand: npm start
   ```

2. Connect your repository to Render
3. Render will automatically deploy on push

### Example: Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source files
COPY . .

# Build the application
RUN npm run build:all

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t stock-gift-value .
docker run -p 3001:3001 stock-gift-value
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
├── api/                     # Backend API
│   ├── handler.ts           # Shared business logic (platform-agnostic)
│   ├── server.ts            # Express server
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
├── dist/                    # Built frontend (after npm run build)
├── dist-server/             # Built server (after npm run build:server)
├── package.json
├── tsconfig.json            # Frontend TypeScript config
├── tsconfig.server.json     # Server TypeScript config
├── vite.config.ts
├── SPEC.md                  # Design specification
└── README.md
```

**Key architectural files:**
- `api/handler.ts` - Core API logic, fully testable without any platform dependencies
- `api/server.ts` - Express server for both development and production
- Handler logic is separated from server concerns for easy testing and portability

## CI/CD

The project includes a GitHub Actions workflow that automatically:

1. Runs ESLint to check code quality
2. Checks Prettier formatting
3. Runs all unit tests
4. Builds the frontend
5. Builds the server

The workflow is triggered on pushes that affect the `typescript/stock-gift-value` directory.

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (frontend) |
| `npm run dev:api` | Start Express dev server (backend) |
| `npm run build` | Build frontend to `dist/` |
| `npm run build:server` | Build server to `dist-server/` |
| `npm run build:all` | Build both frontend and server |
| `npm start` | Run production server |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |

## IRS Guidelines

According to IRS guidelines, the fair market value of donated stock is determined by taking the mean between the highest and lowest quoted selling prices on the valuation date. This application implements this calculation precisely.

## License

This project is part of the ai-playground repository.

## Contributing

1. Ensure all tests pass: `npm test`
2. Ensure code is formatted: `npm run format`
3. Ensure linting passes: `npm run lint`
4. Build successfully: `npm run build:all`
