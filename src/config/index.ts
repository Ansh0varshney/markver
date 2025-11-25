import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://markver:markver123@localhost:5432/markver_db?schema=public'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined
  },
  queue: {
    maxConcurrentOrders: parseInt(process.env.MAX_CONCURRENT_ORDERS || '10', 10),
    ordersPerMinute: parseInt(process.env.ORDERS_PER_MINUTE || '100', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10)
  },
  dex: {
    mockMode: process.env.MOCK_MODE === 'true',
    networkDelayMs: parseInt(process.env.DEX_NETWORK_DELAY_MS || '200', 10),
    executionDelayMs: parseInt(process.env.DEX_EXECUTION_DELAY_MS || '2000', 10)
  },
  trading: {
    defaultSlippageTolerance: parseFloat(process.env.DEFAULT_SLIPPAGE_TOLERANCE || '0.01')
  }
};
