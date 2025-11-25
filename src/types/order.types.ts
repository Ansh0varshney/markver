export enum OrderStatus {
  PENDING = 'pending',
  ROUTING = 'routing',
  BUILDING = 'building',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  SNIPER = 'sniper'
}

export enum DexType {
  RAYDIUM = 'raydium',
  METEORA = 'meteora'
}

export interface Order {
  orderId: string;
  userId?: string;
  orderType: OrderType;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  status: OrderStatus;
  dexSelected?: DexType;
  raydiumPrice?: number;
  meteoraPrice?: number;
  executedPrice?: number;
  txHash?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DexQuote {
  dex: DexType;
  price: number;
  amountOut: number;
  fee: number;
  slippage: number;
  timestamp: number;
}

export interface ExecutionResult {
  orderId: string;
  dex: DexType;
  txHash: string;
  executedPrice: number;
  amountOut: number;
  executionTime: number;
}

export interface WebSocketMessage {
  orderId: string;
  status: OrderStatus;
  timestamp: number;
  data?: {
    dexSelected?: DexType;
    raydiumPrice?: number;
    meteoraPrice?: number;
    executedPrice?: number;
    amountOut?: number;
    txHash?: string;
    error?: string;
  };
}

export interface CreateOrderRequest {
  orderType: OrderType;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  userId?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  status: OrderStatus;
  message: string;
}
