# Markver - Order Execution Engine

A high-performance order execution engine for Solana DEX trading with intelligent routing, WebSocket streaming, and concurrent order processing.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Order Type Selection](#order-type-selection)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Demo Video](#demo-video)

---

## Overview

Markver is a backend order execution engine that processes cryptocurrency trades on Solana DEXs (Raydium and Meteora). It automatically routes orders to the DEX with the best price and provides real-time status updates via WebSocket.

## Features

- **Market Order Execution** - Immediate execution at the best available price
- **Intelligent DEX Routing** - Compares prices across Raydium and Meteora, selects the best deal
- **Real-time Updates** - WebSocket streaming of order lifecycle (pending → routing → building → submitted → confirmed)
- **Concurrent Processing** - Handles up to 10 orders concurrently with BullMQ
- **Queue Management** - Processes 100 orders/minute with exponential backoff retry (3 attempts)
- **Slippage Protection** - Configurable slippage tolerance (default 1%)
- **Mock & Real Modes** - Mock implementation for testing, extensible for real devnet integration

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/orders/execute
       │ → WebSocket upgrade
       │
┌──────▼──────────────────────┐
│   Fastify API Server        │
│  - Order validation (Zod)   │
│  - WebSocket management     │
└──────┬──────────────────────┘
       │
┌──────▼──────────────────────┐
│   BullMQ Queue + Redis      │
│  - Rate limiting            │
│  - Concurrency control (10) │
│  - Exponential backoff      │
└──────┬──────────────────────┘
       │
┌──────▼──────────────────────┐
│   Order Executor Service    │
│  1. DEX Router              │
│     - Fetch Raydium quote   │
│     - Fetch Meteora quote   │
│     - Select best price     │
│  2. Transaction Builder     │
│  3. Execution Handler       │
└──────┬──────────────────────┘
       │
┌──────▼──────────────────────┐
│   Storage Layer             │
│  - PostgreSQL (history)     │
│  - Redis (active orders)    │
└─────────────────────────────┘
```

### Order Status Flow

```
PENDING → ROUTING → BUILDING → SUBMITTED → CONFIRMED
   ↓         ↓          ↓          ↓          ↓
   └─────────┴──────────┴──────────┴─────→ FAILED
```

## Order Type Selection

### Why Market Orders?

I chose to implement **Market Orders** for the following reasons:

1. **Simplicity & Reliability** - Market orders execute immediately, making them straightforward to test and demonstrate
2. **Natural Fit for DEX Routing** - Best showcases the price comparison logic between Raydium and Meteora
3. **Complete Lifecycle** - All status transitions (pending → routing → building → submitted → confirmed) are naturally demonstrated
4. **Production-Ready** - Most common order type in real-world DEX trading

### Extension to Other Order Types

The architecture is designed for easy extension:

- **Limit Orders**: Add a price monitoring service that polls DEX prices every N seconds. When target price is reached, trigger market order execution using the existing engine.

- **Sniper Orders**: Implement a Solana account monitor that watches for new token launches or liquidity pool migrations. On detection, automatically execute a market order through the existing execution pipeline.

Both extensions leverage the same DEX router, queue system, and WebSocket infrastructure already built.

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Fastify (with WebSocket support)
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL (with Prisma ORM)
- **Testing**: Vitest
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Docker & Docker Compose

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd markver
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Start Docker services (PostgreSQL + Redis)**
   ```bash
   npm run docker:up
   ```

5. **Generate Prisma client and run migrations**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

Server will start on `http://localhost:3000`

### Health Check

```bash
curl http://localhost:3000/api/health
```

## API Documentation

### POST /api/orders/execute

Create and execute an order. Connection upgrades to WebSocket for real-time status updates.

**Request Body:**
```json
{
  "orderType": "market",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 10,
  "userId": "user123" // optional
}
```

**WebSocket Messages:**

```json
// 1. Pending
{
  "orderId": "order_1234567890_abc123",
  "status": "pending",
  "timestamp": 1234567890000
}

// 2. Routing
{
  "orderId": "order_1234567890_abc123",
  "status": "routing",
  "timestamp": 1234567890200,
  "data": {
    "raydiumPrice": 100.123,
    "meteoraPrice": 99.876,
    "dexSelected": "meteora"
  }
}

// 3. Building
{
  "orderId": "order_1234567890_abc123",
  "status": "building",
  "timestamp": 1234567890500
}

// 4. Submitted
{
  "orderId": "order_1234567890_abc123",
  "status": "submitted",
  "timestamp": 1234567890800
}

// 5. Confirmed
{
  "orderId": "order_1234567890_abc123",
  "status": "confirmed",
  "timestamp": 1234567893000,
  "data": {
    "txHash": "5xJ7...",
    "executedPrice": 99.95,
    "amountOut": 998.502
  }
}
```

### GET /api/orders/:orderId

Get order details by ID.

**Response:**
```json
{
  "success": true,
  "order": {
    "orderId": "order_1234567890_abc123",
    "status": "confirmed",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 10,
    "amountOut": 998.502,
    "executedPrice": 99.95,
    "dexSelected": "meteora",
    "txHash": "5xJ7...",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### GET /api/orders

Get all orders with optional filtering.

**Query Parameters:**
- `status` - Filter by status (optional)
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset (default: 0)

## Testing

### Run all tests
```bash
npm test
```

### Run specific test suites
```bash
# Unit tests only
npm test tests/unit

# Integration tests only
npm test tests/integration
```

### Test Coverage

The project includes 10+ comprehensive tests covering:

- DEX routing logic (best price selection)
- Queue behavior (concurrency, retries)
- Order validation (Zod schemas)
- Helper functions (ID generation, backoff calculation)
- Integration tests (full order flow)

## Deployment

### Railway (Recommended)

1. Install Railway CLI
   ```bash
   npm install -g @railway/cli
   ```

2. Login and initialize
   ```bash
   railway login
   railway init
   ```

3. Add PostgreSQL and Redis services
   ```bash
   railway add --plugin postgresql
   railway add --plugin redis
   ```

4. Deploy
   ```bash
   railway up
   ```

5. Set environment variables in Railway dashboard

### Render

1. Create new Web Service
2. Connect your GitHub repository
3. Set build command: `npm install && npm run build && npm run prisma:generate`
4. Set start command: `npm start`
5. Add PostgreSQL and Redis services
6. Configure environment variables

## Demo Video
(https://youtu.be/5KAfYfUOq98)

The video demonstrates:
- 5 concurrent orders submitted simultaneously
- WebSocket showing all status updates (pending → routing → confirmed)
- Console logs displaying DEX routing decisions
- Queue processing multiple orders
- Final transaction details

## Project Structure

```
markver/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   └── orders.route.ts
│   │   ├── schemas/
│   │   │   └── order.schema.ts
│   │   └── server.ts
│   ├── services/
│   │   ├── dex/
│   │   │   ├── router.service.ts
│   │   │   ├── raydium.service.ts
│   │   │   └── meteora.service.ts
│   │   ├── execution/
│   │   │   └── executor.service.ts
│   │   ├── queue/
│   │   │   └── order.queue.ts
│   │   └── websocket/
│   │       └── status.service.ts
│   ├── workers/
│   │   └── order.worker.ts
│   ├── db/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── prisma.client.ts
│   │   └── redis.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   └── integration/
└── docker-compose.yml
```

## Configuration

Edit `.env` file to customize:

```env
# Server
PORT=3000

# Queue
MAX_CONCURRENT_ORDERS=10
ORDERS_PER_MINUTE=100
MAX_RETRIES=3

# DEX
MOCK_MODE=true
DEX_NETWORK_DELAY_MS=200
DEX_EXECUTION_DELAY_MS=2000

# Trading
DEFAULT_SLIPPAGE_TOLERANCE=0.01
```

## License

MIT

## Author

Built as part of a backend engineering assessment
