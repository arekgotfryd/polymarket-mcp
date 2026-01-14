# Polymarket MCP Server

An MCP (Model Context Protocol) server that provides access to Polymarket's prediction market APIs with full trading capabilities.

## Features

This server exposes **40+ tools** across Polymarket APIs:

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
