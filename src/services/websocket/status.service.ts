import { WebSocket } from 'ws';
import { WebSocketMessage, OrderStatus } from '../../types/order.types';
import { Logger } from '../../utils/logger';

const logger = new Logger('WebSocketService');

export class WebSocketService {
  private connections: Map<string, WebSocket>;

  constructor() {
    this.connections = new Map();
  }

  /**
   * Register a WebSocket connection for an order
   */
  registerConnection(orderId: string, ws: WebSocket): void {
    this.connections.set(orderId, ws);
    logger.info('WebSocket connection registered', { orderId });

    // Handle connection close
    ws.on('close', () => {
      this.connections.delete(orderId);
      logger.info('WebSocket connection closed', { orderId });
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', { orderId, error: error.message });
      this.connections.delete(orderId);
    });
  }

  /**
   * Send status update to client via WebSocket
   */
  sendStatusUpdate(orderId: string, status: OrderStatus, data?: any): void {
    const ws = this.connections.get(orderId);

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.warn('WebSocket not available for order', { orderId, status });
      return;
    }

    const message: WebSocketMessage = {
      orderId,
      status,
      timestamp: Date.now(),
      data
    };

    try {
      ws.send(JSON.stringify(message));
      logger.info('Status update sent', { orderId, status });
    } catch (error) {
      logger.error('Failed to send status update', { orderId, error });
    }
  }

  /**
   * Send pending status
   */
  sendPending(orderId: string): void {
    this.sendStatusUpdate(orderId, OrderStatus.PENDING);
  }

  /**
   * Send routing status with DEX prices
   */
  sendRouting(orderId: string, raydiumPrice?: number, meteoraPrice?: number, dexSelected?: string): void {
    this.sendStatusUpdate(orderId, OrderStatus.ROUTING, {
      raydiumPrice,
      meteoraPrice,
      dexSelected
    });
  }

  /**
   * Send building status
   */
  sendBuilding(orderId: string): void {
    this.sendStatusUpdate(orderId, OrderStatus.BUILDING);
  }

  /**
   * Send submitted status
   */
  sendSubmitted(orderId: string): void {
    this.sendStatusUpdate(orderId, OrderStatus.SUBMITTED);
  }

  /**
   * Send confirmed status with transaction details
   */
  sendConfirmed(orderId: string, txHash: string, executedPrice: number, amountOut: number): void {
    this.sendStatusUpdate(orderId, OrderStatus.CONFIRMED, {
      txHash,
      executedPrice,
      amountOut
    });
  }

  /**
   * Send failed status with error message
   */
  sendFailed(orderId: string, error: string): void {
    this.sendStatusUpdate(orderId, OrderStatus.FAILED, {
      error
    });
  }

  /**
   * Close connection for an order
   */
  closeConnection(orderId: string): void {
    const ws = this.connections.get(orderId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
      this.connections.delete(orderId);
      logger.info('WebSocket connection closed manually', { orderId });
    }
  }

  /**
   * Get number of active connections
   */
  getActiveConnectionsCount(): number {
    return this.connections.size;
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
