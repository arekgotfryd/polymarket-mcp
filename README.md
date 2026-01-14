# Polymarket MCP Server

An MCP (Model Context Protocol) server that provides access to Polymarket's prediction market APIs.

---

## Using the Official Polymarket CLOB Client (TypeScript)

For programmatic trading and advanced operations, use the official `@polymarket/clob-client` library.

### Installation

```bash
npm install @polymarket/clob-client ethers
```

### Quick Start

```typescript
import { ClobClient } from "@polymarket/clob-client";
import { ethers } from "ethers";

const host = "https://clob.polymarket.com";
const chainId = 137; // Polygon

// Create a signer from your private key
const privateKey = process.env.PRIVATE_KEY;
const signer = new ethers.Wallet(privateKey);

// Your Polymarket profile address (where USDC is deposited)
const funder = "0xYourPolymarketProfileAddress";

// Signature types:
// 0 = Browser wallet (MetaMask, Coinbase Wallet)
// 1 = Magic/Email login
const signatureType = 0;

async function main() {
  // Initialize client and derive API credentials
  const client = new ClobClient(host, chainId, signer);
  const creds = await client.createOrDeriveApiKey();

  // Create authenticated client
  const clobClient = new ClobClient(
    host,
    chainId,
    signer,
    creds,
    signatureType,
    funder
  );

  // Now you can use all client methods
  const markets = await clobClient.getMarkets();
  console.log(markets);
}

main();
```

### Authentication Levels

The CLOB client supports three authentication levels:

| Level | Requirements | Capabilities |
|-------|--------------|--------------|
| **Public** | None | Read market data, prices, orderbooks |
| **L1** | Private key (signer) | Create/derive API credentials |
| **L2** | API credentials | Place orders, manage positions |

### Client Methods Reference

#### Market Data (Public - No Auth Required)

```typescript
// Health check
await client.getOk();

// Server time
await client.getServerTime();

// Get all markets (paginated)
await client.getMarkets(nextCursor?);
await client.getSimplifiedMarkets(nextCursor?);

// Get single market by condition ID
await client.getMarket(conditionID);

// Order book data
await client.getOrderBook(tokenID);
await client.getOrderBooks([{ token_id: "...", side: "BUY" }]);

// Pricing
await client.getPrice(tokenID, "BUY" | "SELL");
await client.getPrices([{ token_id: "...", side: "BUY" }]);
await client.getMidpoint(tokenID);
await client.getMidpoints([{ token_id: "..." }]);
await client.getSpread(tokenID);
await client.getSpreads([{ token_id: "..." }]);
await client.getLastTradePrice(tokenID);

// Historical data
await client.getPricesHistory({
  market: tokenID,
  interval: "1h", // 1m, 5m, 15m, 1h, 4h, 1d
  fidelity: 100,
  startTs: 1234567890,
  endTs: 1234567899,
});

// Market info
await client.getTickSize(tokenID);
await client.getNegRisk(tokenID);
await client.getFeeRateBps(tokenID);
```

#### API Key Management (L1 Auth Required)

```typescript
// Always prefer deriving over creating new keys
await client.createOrDeriveApiKey(nonce?);

// Or explicitly:
await client.deriveApiKey(nonce?);  // Get existing
await client.createApiKey(nonce?);  // Create new

// Manage keys
await client.getApiKeys();
await client.deleteApiKey();

// Read-only keys
await client.createReadonlyApiKey();
await client.getReadonlyApiKeys();
await client.deleteReadonlyApiKey(key);
```

#### Order Management (L2 Auth Required)

```typescript
import { Side, OrderType } from "@polymarket/clob-client";

// Create and post a limit order
const order = await client.createAndPostOrder({
  tokenID: "1234567890...",
  price: 0.50,      // Price between 0 and 1
  size: 100,        // Amount in USDC
  side: Side.BUY,   // or Side.SELL
}, {
  tickSize: "0.01", // Market-specific, get via getTickSize()
  negRisk: false,   // Market-specific, get via getNegRisk()
});

// Create and post a market order
const marketOrder = await client.createAndPostMarketOrder({
  tokenID: "1234567890...",
  amount: 100,      // USDC amount
  side: Side.BUY,
});

// Get open orders
const openOrders = await client.getOpenOrders({
  market: conditionID,  // Optional filter
});

// Get trade history
const trades = await client.getTrades({
  market: conditionID,  // Optional filter
});

// Cancel orders
await client.cancelOrder({ orderID: "..." });
await client.cancelOrders(["hash1", "hash2"]);
await client.cancelAll();
await client.cancelMarketOrders({ market: conditionID });

// Heartbeat (keeps orders alive, cancels if not called within 10s)
await client.postHeartbeat(heartbeatId?);
```

#### Balance & Allowances (L2 Auth Required)

```typescript
// Check balance and allowance
await client.getBalanceAllowance({
  asset_type: "USDC", // or "CONDITIONAL"
  token_id: tokenID,  // Required for CONDITIONAL
});

// Update allowance
await client.updateBalanceAllowance({
  asset_type: "USDC",
});
```

#### Rewards & Earnings (L2 Auth Required)

```typescript
// Get earnings
await client.getEarningsForUserForDay("2024-01-15");
await client.getTotalEarningsForUserForDay("2024-01-15");

// Check reward percentages
await client.getRewardPercentages();
await client.getCurrentRewards();

// Check if orders qualify for rewards
await client.isOrderScoring({ orderId: "..." });
await client.areOrdersScoring({ orderIds: ["..."] });
```

### Complete Trading Example

```typescript
import { ClobClient, Side } from "@polymarket/clob-client";
import { ethers } from "ethers";

async function tradeOnPolymarket() {
  const host = "https://clob.polymarket.com";
  const chainId = 137;
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!);
  const funder = process.env.FUNDER_ADDRESS!;

  // Initialize with L2 auth
  const tempClient = new ClobClient(host, chainId, signer);
  const creds = await tempClient.createOrDeriveApiKey();

  const client = new ClobClient(
    host,
    chainId,
    signer,
    creds,
    0, // EOA signature type
    funder
  );

  // 1. Find a market
  const markets = await client.getMarkets();
  const market = markets.data[0];
  const tokenID = market.tokens[0].token_id;
  const conditionID = market.condition_id;

  // 2. Get market parameters
  const tickSize = await client.getTickSize(tokenID);
  const negRisk = await client.getNegRisk(tokenID);

  // 3. Check current price
  const price = await client.getPrice(tokenID, "BUY");
  console.log(`Current buy price: ${price}`);

  // 4. Place an order
  const order = await client.createAndPostOrder(
    {
      tokenID,
      price: 0.45,
      size: 10,
      side: Side.BUY,
    },
    { tickSize, negRisk }
  );
  console.log(`Order placed: ${order.orderID}`);

  // 5. Check open orders
  const openOrders = await client.getOpenOrders({ market: conditionID });
  console.log(`Open orders: ${openOrders.length}`);

  // 6. Cancel if needed
  // await client.cancelOrder({ orderID: order.orderID });
}

tradeOnPolymarket();
```

### Types Reference

```typescript
// Order sides
enum Side {
  BUY = "BUY",
  SELL = "SELL",
}

// Order types
enum OrderType {
  GTC = "GTC",  // Good Till Cancelled
  GTD = "GTD",  // Good Till Date
  FOK = "FOK",  // Fill Or Kill
}

// User order structure
interface UserOrder {
  tokenID: string;
  price: number;    // 0 to 1
  size: number;     // USDC amount
  side: Side;
  expiration?: number;
}

// Market order structure
interface UserMarketOrder {
  tokenID: string;
  amount: number;   // USDC amount
  side: Side;
}

// API credentials
interface ApiKeyCreds {
  apiKey: string;
  secret: string;
  passphrase: string;
}
```

### Important Notes

1. **Always derive API keys** - Use `createOrDeriveApiKey()` instead of creating new ones
2. **Get market parameters** - Always fetch `tickSize` and `negRisk` for each market before placing orders
3. **Funder address** - This is your Polymarket profile address where you deposit USDC, not your wallet address
4. **Chain ID** - Always use 137 (Polygon mainnet)
5. **Signature types**:
   - `0` for browser wallets (MetaMask, etc.)
   - `1` for Magic/email login

---

## MCP Server Features

This server exposes **40+ tools** across Polymarket APIs, including full trading capabilities.

### Gamma API (Market Discovery & Metadata)
- `get_events` - Fetch prediction market events
- `get_event_by_id` - Get event by ID
- `get_event_by_slug` - Get event by URL slug
- `get_markets` - Fetch prediction markets
- `get_market_by_id` - Get market by ID
- `get_market_by_slug` - Get market by URL slug
- `get_tags` - Get available market tags/categories
- `search_markets` - Search markets by text query

### CLOB API - Public (Prices, Orderbooks)
- `get_price` - Get current market price for a token
- `get_prices` - Get prices for multiple tokens
- `get_midpoint` - Get midpoint price
- `get_orderbook` - Get order book for a token
- `get_spread` - Get bid-ask spread
- `get_last_trade_price` - Get last trade price
- `get_price_history` - Get historical price data
- `get_clob_markets` - Get all CLOB markets
- `get_clob_market` - Get CLOB market by condition ID
- `get_tick_size` - Get minimum tick size for a token
- `get_neg_risk` - Get negative risk flag for a token

### CLOB API - Trading (Requires Authentication)
- `create_order` - Create and submit a limit order
- `create_market_order` - Create and submit a market order
- `cancel_order` - Cancel a specific order
- `cancel_orders` - Cancel multiple orders
- `cancel_all_orders` - Cancel all open orders
- `cancel_market_orders` - Cancel all orders for a market
- `get_open_orders` - Get all open orders
- `get_order` - Get a specific order by ID
- `get_user_trades` - Get trade history for authenticated user

### Balance & Account
- `get_balance_allowance` - Get balance and allowance info
- `update_balance_allowance` - Update/refresh trading allowance
- `derive_api_key` - Derive API credentials from wallet
- `get_api_keys` - Get all API keys

### Rewards & Earnings
- `get_earnings_for_day` - Get earnings breakdown for a day
- `get_reward_percentages` - Get liquidity reward tiers

### Data API (Positions, Activity & History)
- `get_positions` - Get user positions
- `get_trades` - Get trades for user/market
- `get_activity` - Get user on-chain activity
- `get_holders` - Get top position holders
- `get_position_value` - Get total position value
- `get_closed_positions` - Get user's closed positions
- `get_leaderboard` - Get trader leaderboard
- `get_open_interest` - Get open interest data
- `get_event_volume` - Get event trading volume

### Utility
- `get_gamma_status` - Check Gamma API health
- `get_clob_status` - Check CLOB API health
- `get_data_status` - Check Data API health
- `get_server_time` - Get CLOB server time

## Installation

```bash
npm install
npm run build
```

## Configuration

### Environment Variables

For trading functionality, set these environment variables:

```bash
# Required for trading
POLYMARKET_PRIVATE_KEY=your_wallet_private_key
POLYMARKET_FUNDER_ADDRESS=your_polymarket_profile_address

# Optional (defaults to 0)
POLYMARKET_SIGNATURE_TYPE=0  # 0=EOA wallet, 1=Magic/email login
```

**Note:** The funder address is your Polymarket profile address where you deposit USDC, not your wallet address. You can find this in your Polymarket account settings.

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "polymarket": {
      "command": "node",
      "args": ["/path/to/polymarket-mcp-server/dist/index.js"],
      "env": {
        "POLYMARKET_PRIVATE_KEY": "your_private_key",
        "POLYMARKET_FUNDER_ADDRESS": "your_funder_address"
      }
    }
  }
}
```

### Read-Only Mode (No Trading)

If you don't provide the environment variables, the server will still work for all read-only operations (market data, prices, orderbooks, etc.). Trading tools will return an error if called.

### Development

```bash
npm run dev
```

## API Base URLs

- **Gamma API**: `https://gamma-api.polymarket.com`
- **CLOB API**: `https://clob.polymarket.com`
- **Data API**: `https://data-api.polymarket.com`

## Example Queries

### Read-Only Operations

Get active political events:
```
get_events(tag_id: "politics", closed: false, limit: 10)
```

Get current price for a market:
```
get_price(token_id: "...", side: "BUY")
```

Get top traders:
```
get_leaderboard(period: "weekly", limit: 10)
```

### Trading Operations (Requires Authentication)

Place a limit order to buy at $0.45:
```
create_order(token_id: "...", price: 0.45, size: 10, side: "BUY")
```

Place a market order:
```
create_market_order(token_id: "...", amount: 50, side: "BUY")
```

Check your open orders:
```
get_open_orders()
```

Cancel all orders:
```
cancel_all_orders()
```

Check USDC balance:
```
get_balance_allowance(asset_type: "USDC")
```

## Resources

- [Polymarket Developer Docs](https://docs.polymarket.com)
- [CLOB Client GitHub](https://github.com/Polymarket/clob-client)
- [Gamma Markets API](https://docs.polymarket.com/developers/gamma-markets-api)

## License

MIT
