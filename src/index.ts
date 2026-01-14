#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ClobClient, Side, OrderType } from "@polymarket/clob-client";
import { Wallet } from "ethers";

// API Base URLs
const GAMMA_API = "https://gamma-api.polymarket.com";
const CLOB_API = "https://clob.polymarket.com";
const DATA_API = "https://data-api.polymarket.com";
const CHAIN_ID = 137; // Polygon

// Environment variables for trading
const PRIVATE_KEY = process.env.POLYMARKET_PRIVATE_KEY;
const FUNDER_ADDRESS = process.env.POLYMARKET_FUNDER_ADDRESS;
const SIGNATURE_TYPE = parseInt(process.env.POLYMARKET_SIGNATURE_TYPE || "0");

// Helper function to make API requests
async function apiRequest(
  baseUrl: string,
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<unknown> {
  const url = new URL(endpoint, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ClobClient singleton with lazy initialization
let clobClient: ClobClient | null = null;
let clobClientInitialized = false;

async function getClobClient(): Promise<ClobClient> {
  if (clobClient && clobClientInitialized) {
    return clobClient;
  }

  if (!PRIVATE_KEY) {
    throw new Error("POLYMARKET_PRIVATE_KEY environment variable is required for trading operations");
  }

  if (!FUNDER_ADDRESS) {
    throw new Error("POLYMARKET_FUNDER_ADDRESS environment variable is required for trading operations");
  }

  const signer = new Wallet(PRIVATE_KEY);

  // First create a temporary client to derive API credentials
  const tempClient = new ClobClient(CLOB_API, CHAIN_ID, signer);
  const creds = await tempClient.createOrDeriveApiKey();

  // Create the authenticated client
  clobClient = new ClobClient(
    CLOB_API,
    CHAIN_ID,
    signer,
    creds,
    SIGNATURE_TYPE,
    FUNDER_ADDRESS
  );

  clobClientInitialized = true;
  return clobClient;
}

// Create a public-only client for read operations that don't need auth
function getPublicClobClient(): ClobClient {
  return new ClobClient(CLOB_API, CHAIN_ID);
}

// Create the MCP server
const server = new McpServer({
  name: "polymarket",
  version: "1.0.0",
});

// ============================================================================
// GAMMA API TOOLS - Market Discovery & Metadata
// ============================================================================

server.tool(
  "get_events",
  "Fetch prediction market events from Polymarket. Events group related markets together.",
  {
    limit: z.number().optional().describe("Number of events to return (default: 100)"),
    offset: z.number().optional().describe("Pagination offset"),
    closed: z.boolean().optional().describe("Include closed events (default: false)"),
    order: z.string().optional().describe("Sort field (e.g., 'id', 'volume', 'liquidity')"),
    ascending: z.boolean().optional().describe("Sort ascending (default: false)"),
    tag_id: z.string().optional().describe("Filter by tag ID"),
    slug: z.string().optional().describe("Filter by event slug"),
  },
  async ({ limit, offset, closed, order, ascending, tag_id, slug }) => {
    try {
      const data = await apiRequest(GAMMA_API, "/events", {
        limit: limit ?? 100,
        offset,
        closed: closed ?? false,
        order,
        ascending,
        tag_id,
        slug,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching events: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_event_by_id",
  "Fetch a specific event by its ID from Polymarket.",
  {
    event_id: z.string().describe("The event ID to fetch"),
  },
  async ({ event_id }) => {
    try {
      const data = await apiRequest(GAMMA_API, `/events/${event_id}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching event: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_event_by_slug",
  "Fetch a specific event by its URL slug from Polymarket.",
  {
    slug: z.string().describe("The event slug (from the Polymarket URL)"),
  },
  async ({ slug }) => {
    try {
      const data = await apiRequest(GAMMA_API, `/events/slug/${slug}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching event by slug: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_markets",
  "Fetch prediction markets from Polymarket. Markets are individual tradable contracts.",
  {
    limit: z.number().optional().describe("Number of markets to return (default: 100)"),
    offset: z.number().optional().describe("Pagination offset"),
    closed: z.boolean().optional().describe("Include closed markets (default: false)"),
    order: z.string().optional().describe("Sort field (e.g., 'id', 'volume', 'liquidity')"),
    ascending: z.boolean().optional().describe("Sort ascending (default: false)"),
    tag_id: z.string().optional().describe("Filter by tag ID"),
    active: z.boolean().optional().describe("Filter by active status"),
  },
  async ({ limit, offset, closed, order, ascending, tag_id, active }) => {
    try {
      const data = await apiRequest(GAMMA_API, "/markets", {
        limit: limit ?? 100,
        offset,
        closed: closed ?? false,
        order,
        ascending,
        tag_id,
        active,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching markets: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_market_by_id",
  "Fetch a specific market by its ID from Polymarket.",
  {
    market_id: z.string().describe("The market ID to fetch"),
  },
  async ({ market_id }) => {
    try {
      const data = await apiRequest(GAMMA_API, `/markets/${market_id}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching market: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_market_by_slug",
  "Fetch a specific market by its URL slug from Polymarket.",
  {
    slug: z.string().describe("The market slug (from the Polymarket URL)"),
  },
  async ({ slug }) => {
    try {
      const data = await apiRequest(GAMMA_API, `/markets/slug/${slug}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching market by slug: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_tags",
  "Fetch available market tags/categories from Polymarket.",
  {},
  async () => {
    try {
      const data = await apiRequest(GAMMA_API, "/tags");
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching tags: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "search_markets",
  "Search for markets and events on Polymarket using a text query.",
  {
    query: z.string().describe("Search query text"),
    limit: z.number().optional().describe("Number of results to return"),
  },
  async ({ query, limit }) => {
    try {
      const data = await apiRequest(GAMMA_API, "/search", {
        query,
        limit,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error searching markets: ${error}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// CLOB API TOOLS - Prices, Orderbooks (Public)
// ============================================================================

server.tool(
  "get_price",
  "Get the current market price for a specific token on Polymarket.",
  {
    token_id: z.string().describe("The CLOB token ID"),
    side: z.enum(["BUY", "SELL"]).describe("The side of the order (BUY or SELL)"),
  },
  async ({ token_id, side }) => {
    try {
      const client = getPublicClobClient();
      const data = await client.getPrice(token_id, side as Side);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching price: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_prices",
  "Get current market prices for multiple tokens on Polymarket.",
  {
    token_ids: z.array(z.string()).describe("Array of CLOB token IDs"),
    side: z.enum(["BUY", "SELL"]).describe("The side of the order (BUY or SELL)"),
  },
  async ({ token_ids, side }) => {
    try {
      const client = getPublicClobClient();
      const params = token_ids.map(id => ({ token_id: id, side: side as Side }));
      const data = await client.getPrices(params);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching prices: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_midpoint",
  "Get the midpoint price for a specific token on Polymarket.",
  {
    token_id: z.string().describe("The CLOB token ID"),
  },
  async ({ token_id }) => {
    try {
      const client = getPublicClobClient();
      const data = await client.getMidpoint(token_id);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching midpoint: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_orderbook",
  "Get the order book for a specific token on Polymarket.",
  {
    token_id: z.string().describe("The CLOB token ID"),
  },
  async ({ token_id }) => {
    try {
      const client = getPublicClobClient();
      const data = await client.getOrderBook(token_id);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching orderbook: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_spread",
  "Get the bid-ask spread for a specific token on Polymarket.",
  {
    token_id: z.string().describe("The CLOB token ID"),
  },
  async ({ token_id }) => {
    try {
      const client = getPublicClobClient();
      const data = await client.getSpread(token_id);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching spread: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_last_trade_price",
  "Get the last trade price for a specific token on Polymarket.",
  {
    token_id: z.string().describe("The CLOB token ID"),
  },
  async ({ token_id }) => {
    try {
      const client = getPublicClobClient();
      const data = await client.getLastTradePrice(token_id);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching last trade price: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_price_history",
  "Get historical price data for a specific token on Polymarket.",
  {
    token_id: z.string().describe("The CLOB token ID"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).optional().describe("Time interval for price points"),
    fidelity: z.number().optional().describe("Number of data points to return"),
    start_ts: z.number().optional().describe("Start timestamp (Unix seconds)"),
    end_ts: z.number().optional().describe("End timestamp (Unix seconds)"),
  },
  async ({ token_id, interval, fidelity, start_ts, end_ts }) => {
    try {
      const client = getPublicClobClient();
      const data = await client.getPricesHistory({
        market: token_id,
        interval: interval as any,
        fidelity,
        startTs: start_ts,
        endTs: end_ts,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching price history: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_clob_markets",
  "Get all available markets from the CLOB API.",
  {
    next_cursor: z.string().optional().describe("Cursor for pagination"),
  },
  async ({ next_cursor }) => {
    try {
      const client = getPublicClobClient();
      const data = await client.getMarkets(next_cursor);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching CLOB markets: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_clob_market",
  "Get a specific market from the CLOB API by condition ID.",
  {
    condition_id: z.string().describe("The condition ID of the market"),
  },
  async ({ condition_id }) => {
    try {
      const client = getPublicClobClient();
      const data = await client.getMarket(condition_id);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching CLOB market: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_tick_size",
  "Get the minimum tick size for a token (required for placing orders).",
  {
    token_id: z.string().describe("The CLOB token ID"),
  },
  async ({ token_id }) => {
    try {
      const client = getPublicClobClient();
      const data = await client.getTickSize(token_id);
      return {
        content: [{ type: "text", text: JSON.stringify({ tick_size: data }, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching tick size: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_neg_risk",
  "Get the negative risk flag for a token (required for placing orders).",
  {
    token_id: z.string().describe("The CLOB token ID"),
  },
  async ({ token_id }) => {
    try {
      const client = getPublicClobClient();
      const data = await client.getNegRisk(token_id);
      return {
        content: [{ type: "text", text: JSON.stringify({ neg_risk: data }, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching neg risk: ${error}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// TRADING TOOLS - Requires Authentication (L2)
// ============================================================================

server.tool(
  "create_order",
  "Create and submit a limit order on Polymarket. Requires POLYMARKET_PRIVATE_KEY and POLYMARKET_FUNDER_ADDRESS env vars.",
  {
    token_id: z.string().describe("The CLOB token ID to trade"),
    price: z.number().min(0.01).max(0.99).describe("Price between 0.01 and 0.99"),
    size: z.number().positive().describe("Order size in USDC"),
    side: z.enum(["BUY", "SELL"]).describe("Order side (BUY or SELL)"),
    expiration: z.number().optional().describe("Order expiration timestamp (Unix seconds)"),
  },
  async ({ token_id, price, size, side, expiration }) => {
    try {
      const client = await getClobClient();

      // Get market parameters
      const tickSize = await client.getTickSize(token_id);
      const negRisk = await client.getNegRisk(token_id);

      const order = await client.createAndPostOrder(
        {
          tokenID: token_id,
          price,
          size,
          side: side as Side,
          expiration,
        },
        { tickSize, negRisk }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(order, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error creating order: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "create_market_order",
  "Create and submit a market order on Polymarket. Executes immediately at best available price.",
  {
    token_id: z.string().describe("The CLOB token ID to trade"),
    amount: z.number().positive().describe("Amount in USDC to trade"),
    side: z.enum(["BUY", "SELL"]).describe("Order side (BUY or SELL)"),
  },
  async ({ token_id, amount, side }) => {
    try {
      const client = await getClobClient();

      // Get market parameters
      const tickSize = await client.getTickSize(token_id);
      const negRisk = await client.getNegRisk(token_id);

      const order = await client.createAndPostMarketOrder(
        {
          tokenID: token_id,
          amount,
          side: side as Side,
        },
        { tickSize, negRisk }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(order, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error creating market order: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "cancel_order",
  "Cancel a specific order by its order ID.",
  {
    order_id: z.string().describe("The order ID to cancel"),
  },
  async ({ order_id }) => {
    try {
      const client = await getClobClient();
      const result = await client.cancelOrder({ orderID: order_id });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error canceling order: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "cancel_orders",
  "Cancel multiple orders by their order hashes.",
  {
    order_hashes: z.array(z.string()).describe("Array of order hashes to cancel"),
  },
  async ({ order_hashes }) => {
    try {
      const client = await getClobClient();
      const result = await client.cancelOrders(order_hashes);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error canceling orders: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "cancel_all_orders",
  "Cancel all open orders for the authenticated user.",
  {},
  async () => {
    try {
      const client = await getClobClient();
      const result = await client.cancelAll();
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error canceling all orders: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "cancel_market_orders",
  "Cancel all orders for a specific market.",
  {
    market: z.string().describe("The market condition ID"),
    asset_id: z.string().optional().describe("Optional asset ID to filter"),
  },
  async ({ market, asset_id }) => {
    try {
      const client = await getClobClient();
      const result = await client.cancelMarketOrders({ market, asset_id });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error canceling market orders: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_open_orders",
  "Get all open orders for the authenticated user.",
  {
    market: z.string().optional().describe("Filter by market condition ID"),
  },
  async ({ market }) => {
    try {
      const client = await getClobClient();
      const result = await client.getOpenOrders(market ? { market } : undefined);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching open orders: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_order",
  "Get a specific order by its ID.",
  {
    order_id: z.string().describe("The order ID to fetch"),
  },
  async ({ order_id }) => {
    try {
      const client = await getClobClient();
      const result = await client.getOrder(order_id);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching order: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_user_trades",
  "Get trade history for the authenticated user.",
  {
    market: z.string().optional().describe("Filter by market condition ID"),
  },
  async ({ market }) => {
    try {
      const client = await getClobClient();
      const result = await client.getTrades(market ? { market } : undefined);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching user trades: ${error}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// BALANCE & ALLOWANCE TOOLS
// ============================================================================

server.tool(
  "get_balance_allowance",
  "Get balance and allowance information for the authenticated user.",
  {
    asset_type: z.enum(["USDC", "CONDITIONAL"]).describe("Asset type to check"),
    token_id: z.string().optional().describe("Token ID (required for CONDITIONAL assets)"),
  },
  async ({ asset_type, token_id }) => {
    try {
      const client = await getClobClient();
      const result = await client.getBalanceAllowance({
        asset_type: asset_type as any,
        token_id,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching balance: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "update_balance_allowance",
  "Update/refresh allowance for trading.",
  {
    asset_type: z.enum(["USDC", "CONDITIONAL"]).describe("Asset type to update"),
    token_id: z.string().optional().describe("Token ID (required for CONDITIONAL assets)"),
  },
  async ({ asset_type, token_id }) => {
    try {
      const client = await getClobClient();
      const result = await client.updateBalanceAllowance({
        asset_type: asset_type as any,
        token_id,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error updating allowance: ${error}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

server.tool(
  "derive_api_key",
  "Derive or create API credentials for the authenticated wallet.",
  {},
  async () => {
    try {
      if (!PRIVATE_KEY) {
        throw new Error("POLYMARKET_PRIVATE_KEY environment variable is required");
      }

      const signer = new Wallet(PRIVATE_KEY);
      const tempClient = new ClobClient(CLOB_API, CHAIN_ID, signer);
      const creds = await tempClient.createOrDeriveApiKey();

      return {
        content: [{ type: "text", text: JSON.stringify(creds, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error deriving API key: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_api_keys",
  "Get all API keys for the authenticated user.",
  {},
  async () => {
    try {
      const client = await getClobClient();
      const result = await client.getApiKeys();
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching API keys: ${error}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// REWARDS & EARNINGS
// ============================================================================

server.tool(
  "get_earnings_for_day",
  "Get earnings breakdown for the authenticated user for a specific day.",
  {
    date: z.string().describe("Date in YYYY-MM-DD format"),
  },
  async ({ date }) => {
    try {
      const client = await getClobClient();
      const result = await client.getEarningsForUserForDay(date);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching earnings: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_reward_percentages",
  "Get current liquidity reward tier percentages.",
  {},
  async () => {
    try {
      const client = await getClobClient();
      const result = await client.getRewardPercentages();
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching reward percentages: ${error}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// DATA API TOOLS - Positions, Activity & History
// ============================================================================

server.tool(
  "get_positions",
  "Get current positions for a user address on Polymarket.",
  {
    address: z.string().describe("The user's wallet address"),
    market: z.string().optional().describe("Filter by market condition ID"),
    limit: z.number().optional().describe("Number of positions to return"),
    offset: z.number().optional().describe("Pagination offset"),
  },
  async ({ address, market, limit, offset }) => {
    try {
      const data = await apiRequest(DATA_API, "/positions", {
        user: address,
        market,
        limit,
        offset,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching positions: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_trades",
  "Get trades for a user or market on Polymarket.",
  {
    address: z.string().optional().describe("Filter by user's wallet address"),
    market: z.string().optional().describe("Filter by market condition ID"),
    limit: z.number().optional().describe("Number of trades to return"),
    offset: z.number().optional().describe("Pagination offset"),
  },
  async ({ address, market, limit, offset }) => {
    try {
      const data = await apiRequest(DATA_API, "/trades", {
        user: address,
        market,
        limit,
        offset,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching trades: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_activity",
  "Get on-chain activity for a user on Polymarket.",
  {
    address: z.string().describe("The user's wallet address"),
    limit: z.number().optional().describe("Number of activities to return"),
    offset: z.number().optional().describe("Pagination offset"),
  },
  async ({ address, limit, offset }) => {
    try {
      const data = await apiRequest(DATA_API, "/activity", {
        user: address,
        limit,
        offset,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching activity: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_holders",
  "Get top position holders for a market on Polymarket.",
  {
    market: z.string().describe("The market condition ID"),
    limit: z.number().optional().describe("Number of holders to return"),
  },
  async ({ market, limit }) => {
    try {
      const data = await apiRequest(DATA_API, "/holders", {
        market,
        limit,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching holders: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_position_value",
  "Get total value of a user's positions on Polymarket.",
  {
    address: z.string().describe("The user's wallet address"),
  },
  async ({ address }) => {
    try {
      const data = await apiRequest(DATA_API, "/value", {
        user: address,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching position value: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_closed_positions",
  "Get closed positions for a user on Polymarket.",
  {
    address: z.string().describe("The user's wallet address"),
    limit: z.number().optional().describe("Number of positions to return"),
    offset: z.number().optional().describe("Pagination offset"),
  },
  async ({ address, limit, offset }) => {
    try {
      const data = await apiRequest(DATA_API, "/v1/closed-positions", {
        user: address,
        limit,
        offset,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching closed positions: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_leaderboard",
  "Get trader leaderboard rankings on Polymarket.",
  {
    period: z.enum(["daily", "weekly", "monthly", "all"]).optional().describe("Time period for rankings"),
    limit: z.number().optional().describe("Number of traders to return"),
    offset: z.number().optional().describe("Pagination offset"),
  },
  async ({ period, limit, offset }) => {
    try {
      const data = await apiRequest(DATA_API, "/v1/leaderboard", {
        period,
        limit,
        offset,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching leaderboard: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_open_interest",
  "Get open interest data for markets on Polymarket.",
  {
    market: z.string().optional().describe("Filter by market condition ID"),
  },
  async ({ market }) => {
    try {
      const data = await apiRequest(DATA_API, "/open-interest", {
        market,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching open interest: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_event_volume",
  "Get live trading volume for an event on Polymarket.",
  {
    event_id: z.string().describe("The event ID"),
  },
  async ({ event_id }) => {
    try {
      const data = await apiRequest(DATA_API, "/volume", {
        event_id,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching event volume: ${error}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// UTILITY TOOLS
// ============================================================================

server.tool(
  "get_gamma_status",
  "Check the health status of the Polymarket Gamma API.",
  {},
  async () => {
    try {
      const data = await apiRequest(GAMMA_API, "/");
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Gamma API error: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_clob_status",
  "Check the health status of the Polymarket CLOB API.",
  {},
  async () => {
    try {
      const client = getPublicClobClient();
      const data = await client.getOk();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `CLOB API error: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_data_status",
  "Check the health status of the Polymarket Data API.",
  {},
  async () => {
    try {
      const data = await apiRequest(DATA_API, "/");
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Data API error: ${error}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_server_time",
  "Get the current server time from Polymarket CLOB.",
  {},
  async () => {
    try {
      const client = getPublicClobClient();
      const data = await client.getServerTime();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching server time: ${error}` }],
        isError: true,
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Polymarket MCP Server running on stdio");

  if (!PRIVATE_KEY) {
    console.error("Warning: POLYMARKET_PRIVATE_KEY not set - trading features disabled");
  }
  if (!FUNDER_ADDRESS) {
    console.error("Warning: POLYMARKET_FUNDER_ADDRESS not set - trading features disabled");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
