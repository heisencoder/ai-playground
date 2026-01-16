# Polyarb - Polymarket Arbitrage Detection CLI

A command-line tool for detecting arbitrage opportunities in Polymarket prediction markets.

## Features

- **Market Analysis**: Analyze individual or multiple markets for arbitrage opportunities
- **Event Support**: Handles multi-outcome events (like NFL championships with many teams)
- **Order Book Analysis**: Uses order book data to calculate realistic execution prices
- **Cross-Market Analysis**: Detect inconsistencies between related markets (e.g., conference championship vs Super Bowl)

## Installation

```bash
cd polyarb
npm install
```

## Usage

### Quick Analysis (NFL Markets)

Analyze the three main NFL championship markets:

```bash
npm run dev quick
```

This analyzes:
- Super Bowl Champion 2026
- AFC Champion
- NFC Champion

### Analyze Specific Markets

```bash
npm run dev analyze <market-slug-1> <market-slug-2> ...

# Example:
npm run dev analyze super-bowl-champion-2026-731 afc-champion-1
```

Options:
- `-p, --min-profit <percent>`: Minimum profit percentage threshold (default: 0.5)
- `-l, --min-liquidity <amount>`: Minimum liquidity per side (default: 100)
- `--no-depth`: Skip order book depth analysis

### Search for Markets

```bash
npm run dev search "<query>"

# Example:
npm run dev search "Super Bowl"
```

Options:
- `-l, --limit <number>`: Maximum results to return (default: 10)

## How It Works

### Single Market Arbitrage

The tool checks if the sum of all outcome probabilities (Yes prices) deviates from 1.0:

- **Sum > 1.0**: Market is overpriced - potential profit by selling all outcomes
- **Sum < 1.0**: Market is underpriced - potential profit by buying all outcomes

### Cross-Market Arbitrage

For related markets (like conference championship vs Super Bowl), the tool detects logical inconsistencies. For example:

- If Team A has a **lower** probability of winning their conference than Team B
- But Team A has a **higher** probability of winning the Super Bowl than Team B
- This is logically inconsistent since you must win the conference to reach the Super Bowl

## Development

```bash
# Run in development mode
npm run dev <command>

# Build for production
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint

# Format code
npm run format
```

## API Client

The tool interfaces with two Polymarket APIs:

- **Gamma API** (`gamma-api.polymarket.com`): Market metadata, prices, and event information
- **CLOB API** (`clob.polymarket.com`): Order book data for precise execution prices

## Project Structure

```
polyarb/
├── src/
│   ├── api/           # Polymarket API client
│   ├── arbitrage/     # Arbitrage detection logic
│   ├── cli/           # CLI implementation
│   ├── scripts/       # Utility scripts
│   ├── test/          # Test fixtures
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── package.json
└── tsconfig.json
```

## Disclaimer

This tool is for informational and educational purposes only. Prediction market trading involves risk. Always do your own research before making any trades.
