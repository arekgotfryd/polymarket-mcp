# CLAUDE.md

## Project Overview

This is a Polymarket MCP (Model Context Protocol) server that provides tools for interacting with Polymarket's prediction market APIs. It enables both read-only market data access and authenticated trading operations.

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Language**: TypeScript
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Trading Client**: `@polymarket/clob-client` (uses ethers v5)
- **Validation**: Zod

## Project Structure

```
polymarket-mcp-server/
├── src/
│   └── index.ts       # Main MCP server with all tools
├── dist/              # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

## Key Files

- `src/index.ts` - Contains all MCP tool definitions organized by category:
  - Gamma API tools (market discovery)
  - CLOB API public tools (prices, orderbooks)
  - CLOB API trading tools (orders, cancellations)
  - Balance & account tools
  - Rewards tools
  - Data API tools (positions, activity)
  - Utility tools (health checks)

## Build Commands

```bash
npm install      # Install dependencies
npm run build    # Compile TypeScript to dist/
npm run dev      # Run with tsx (development)
npm start        # Run compiled version
```

## Environment Variables

For trading functionality:
- `POLYMARKET_PRIVATE_KEY` - Wallet private key (required for trading)
- `POLYMARKET_FUNDER_ADDRESS` - Polymarket profile address (required for trading)
- `POLYMARKET_SIGNATURE_TYPE` - 0 for EOA wallets, 1 for Magic/email (optional, defaults to 0)

## API Base URLs

- Gamma API: `https://gamma-api.polymarket.com` - Market discovery & metadata
- CLOB API: `https://clob.polymarket.com` - Trading, prices, orderbooks
- Data API: `https://data-api.polymarket.com` - Positions, activity, history

## Authentication Architecture

The server uses a two-tier authentication system:

1. **Public operations** - No auth needed, uses a basic ClobClient instance
2. **Trading operations** - Requires L2 auth with API credentials derived from wallet

The `getClobClient()` function lazily initializes an authenticated client when trading tools are first called.

## Important Implementation Details

- Uses ethers v5 (not v6) due to clob-client compatibility
- The `server.tool()` API signature shows deprecation warnings but still works
- Trading tools automatically fetch `tickSize` and `negRisk` for each token before placing orders
- Error handling returns `isError: true` with descriptive messages

## Common Polymarket Concepts

- **Event**: A group of related markets (e.g., "2024 Election")
- **Market**: A single tradable prediction contract
- **Token ID**: The CLOB identifier for a specific outcome token
- **Condition ID**: The market identifier in the CLOB system
- **Funder Address**: The Polymarket profile address (where USDC is deposited)
