import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OrderExecutorService } from '../../src/services/execution/executor.service';
import { prisma } from '../../src/db/prisma.client';
import { OrderType, OrderStatus } from '../../src/types/order.types';
import { generateOrderId } from '../../src/utils/helpers';

describe('Order Execution Flow (Integration)', () => {
  let executor: OrderExecutorService;

  beforeAll(async () => {
    executor = new OrderExecutorService();
    // Note: This assumes database is already set up
  });

  afterAll(async () => {
    // Cleanup test orders
    await prisma.order.deleteMany({
      where: {
        orderId: {
          contains: 'test_'
        }
      }
    });
  });

  it('should execute a complete market order flow', async () => {
    const orderId = `test_${generateOrderId()}`;

    // Create order in database
    await prisma.order.create({
      data: {
        orderId,
        orderType: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 10,
        status: OrderStatus.PENDING
      }
    });

    // Execute order
    await executor.executeOrder({
      orderId,
      orderType: OrderType.MARKET,
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amountIn: 10
    });

    // Verify order was executed
    const order = await prisma.order.findUnique({
      where: { orderId }
    });

    expect(order).toBeDefined();
    expect(order!.status).toBe(OrderStatus.CONFIRMED);
    expect(order!.txHash).toBeDefined();
    expect(order!.executedPrice).toBeGreaterThan(0);
    expect(order!.amountOut).toBeGreaterThan(0);
    expect(order!.dexSelected).toMatch(/raydium|meteora/);
  }, 10000);

  it('should store DEX routing information', async () => {
    const orderId = `test_${generateOrderId()}`;

    await prisma.order.create({
      data: {
        orderId,
        orderType: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 5,
        status: OrderStatus.PENDING
      }
    });

    await executor.executeOrder({
      orderId,
      orderType: OrderType.MARKET,
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amountIn: 5
    });

    const order = await prisma.order.findUnique({
      where: { orderId }
    });

    expect(order!.raydiumPrice).toBeDefined();
    expect(order!.meteoraPrice).toBeDefined();
    expect(order!.raydiumPrice).toBeGreaterThan(0);
    expect(order!.meteoraPrice).toBeGreaterThan(0);
  }, 10000);

  it('should reject non-MARKET order types', async () => {
    const orderId = `test_${generateOrderId()}`;

    await prisma.order.create({
      data: {
        orderId,
        orderType: OrderType.LIMIT,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 10,
        status: OrderStatus.PENDING
      }
    });

    await expect(
      executor.executeOrder({
        orderId,
        orderType: OrderType.LIMIT,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 10
      })
    ).rejects.toThrow(/not supported/);
  });
});
