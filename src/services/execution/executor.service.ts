import { DexRouterService } from '../dex/router.service';
import { webSocketService } from '../websocket/status.service';
import { prisma } from '../../db/prisma.client';
import { OrderStatus, OrderType } from '../../types/order.types';
import { config } from '../../config';
import { Logger } from '../../utils/logger';
import { OrderJobData } from '../queue/order.queue';

const logger = new Logger('ExecutorService');

export class OrderExecutorService {
  private dexRouter: DexRouterService;

  constructor() {
    this.dexRouter = new DexRouterService();
  }

  /**
   * Execute an order through its complete lifecycle
   */
  async executeOrder(orderData: OrderJobData): Promise<void> {
    const { orderId, orderType, tokenIn, tokenOut, amountIn, userId } = orderData;

    logger.info('Starting order execution', { orderId, orderType });

    try {
      // Step 1: Mark as pending
      await this.updateOrderStatus(orderId, OrderStatus.PENDING);
      webSocketService.sendPending(orderId);

      // Step 2: Route order - compare DEX prices
      await this.updateOrderStatus(orderId, OrderStatus.ROUTING);
      webSocketService.sendRouting(orderId);

      const { bestQuote, raydiumQuote, meteoraQuote } = await this.dexRouter.getBestQuote(
        tokenIn,
        tokenOut,
        amountIn
      );

      // Update database and send routing info to client
      await prisma.order.update({
        where: { orderId },
        data: {
          dexSelected: bestQuote.dex,
          raydiumPrice: raydiumQuote.price,
          meteoraPrice: meteoraQuote.price
        }
      });

      webSocketService.sendRouting(
        orderId,
        raydiumQuote.price,
        meteoraQuote.price,
        bestQuote.dex
      );

      // Step 3: Build transaction
      await this.updateOrderStatus(orderId, OrderStatus.BUILDING);
      webSocketService.sendBuilding(orderId);

      // Calculate minimum amount out with slippage protection
      const slippageTolerance = config.trading.defaultSlippageTolerance;
      const minAmountOut = bestQuote.amountOut * (1 - slippageTolerance);

      // Step 4: Submit transaction
      await this.updateOrderStatus(orderId, OrderStatus.SUBMITTED);
      webSocketService.sendSubmitted(orderId);

      const { txHash, executedPrice, amountOut } = await this.dexRouter.executeSwap(
        bestQuote.dex,
        tokenIn,
        tokenOut,
        amountIn,
        minAmountOut
      );

      // Step 5: Confirm success
      await this.updateOrderStatus(orderId, OrderStatus.CONFIRMED, {
        txHash,
        executedPrice,
        amountOut
      });

      webSocketService.sendConfirmed(orderId, txHash, executedPrice, amountOut);

      logger.info('Order execution completed successfully', {
        orderId,
        txHash,
        executedPrice,
        amountOut
      });

    } catch (error: any) {
      logger.error('Order execution failed', { orderId, error: error.message });

      // Mark order as failed
      await this.updateOrderStatus(orderId, OrderStatus.FAILED, {
        error: error.message
      });

      webSocketService.sendFailed(orderId, error.message);

      // Re-throw to let BullMQ handle retry logic
      throw error;
    }
  }

  /**
   * Update order status in database
   */
  private async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    additionalData?: {
      txHash?: string;
      executedPrice?: number;
      amountOut?: number;
      error?: string;
    }
  ): Promise<void> {
    try {
      await prisma.order.update({
        where: { orderId },
        data: {
          status,
          ...additionalData,
          updatedAt: new Date()
        }
      });

      logger.info('Order status updated', { orderId, status });
    } catch (error) {
      logger.error('Failed to update order status', { orderId, status, error });
      throw error;
    }
  }

  /**
   * Validate order type (currently only MARKET is supported)
   */
  validateOrderType(orderType: OrderType): void {
    if (orderType !== OrderType.MARKET) {
      throw new Error(
        `Order type ${orderType} is not supported. Currently only MARKET orders are implemented.`
      );
    }
  }
}

export const orderExecutor = new OrderExecutorService();
