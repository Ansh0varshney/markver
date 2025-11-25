import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../db/prisma.client';
import { addOrderToQueue } from '../../services/queue/order.queue';
import { webSocketService } from '../../services/websocket/status.service';
import { orderExecutor } from '../../services/execution/executor.service';
import { validateCreateOrder } from '../schemas/order.schema';
import { OrderStatus, OrderType } from '../../types/order.types';
import { generateOrderId } from '../../utils/helpers';
import { Logger } from '../../utils/logger';

const logger = new Logger('OrdersRoute');

export async function ordersRoute(fastify: FastifyInstance) {
  /**
   * POST /api/orders/execute
   * Create and execute an order (REST endpoint for Postman/HTTP clients)
   */
  fastify.post('/api/orders/execute', async (req: FastifyRequest, reply: FastifyReply) => {
    const orderId = generateOrderId();
    logger.info('New order request received', { orderId });

    try {
      // Parse and validate request body
      const body = req.body as any;
      const orderData = validateCreateOrder(body);

      // Validate order type (only MARKET is supported currently)
      orderExecutor.validateOrderType(orderData.orderType);

      // Create order in database
      await prisma.order.create({
        data: {
          orderId,
          userId: orderData.userId,
          orderType: orderData.orderType,
          tokenIn: orderData.tokenIn,
          tokenOut: orderData.tokenOut,
          amountIn: orderData.amountIn,
          status: OrderStatus.PENDING
        }
      });

      logger.info('Order created in database', { orderId });

      // Add order to queue for processing
      await addOrderToQueue({
        orderId,
        ...orderData
      });

      logger.info('Order added to execution queue', { orderId });

      // Return immediate response
      return reply.status(201).send({
        success: true,
        orderId,
        status: OrderStatus.PENDING,
        message: 'Order received and queued for execution',
        statusEndpoint: `/api/orders/${orderId}`
      });

    } catch (error: any) {
      logger.error('Failed to create order', { orderId, error: error.message });
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/orders/ws
   * WebSocket endpoint for real-time order status updates
   */
  fastify.get('/api/orders/ws', { websocket: true }, (connection) => {
    logger.info('WebSocket connection established');

    connection.socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        const { orderId } = data;

        if (orderId) {
          // Register WebSocket connection for this order
          webSocketService.registerConnection(orderId, connection.socket as any);
          logger.info('WebSocket registered for order', { orderId });
        }
      } catch (error: any) {
        logger.error('WebSocket message error', { error: error.message });
      }
    });

    connection.socket.on('close', () => {
      logger.info('WebSocket connection closed');
    });
  });

  /**
   * GET /api/orders/:orderId
   * Get order details by ID
   */
  fastify.get('/api/orders/:orderId', async (req: FastifyRequest, reply: FastifyReply) => {
    const { orderId } = req.params as { orderId: string };

    try {
      const order = await prisma.order.findUnique({
        where: { orderId }
      });

      if (!order) {
        return reply.status(404).send({
          error: 'Order not found',
          orderId
        });
      }

      return reply.send({
        success: true,
        order
      });

    } catch (error: any) {
      logger.error('Failed to fetch order', { orderId, error: error.message });
      return reply.status(500).send({
        error: 'Failed to fetch order',
        message: error.message
      });
    }
  });

  /**
   * GET /api/orders
   * Get all orders with optional filters
   */
  fastify.get('/api/orders', async (req: FastifyRequest, reply: FastifyReply) => {
    const { status, limit = 50, offset = 0 } = req.query as any;

    try {
      const where = status ? { status } : {};

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.order.count({ where })
      ]);

      return reply.send({
        success: true,
        orders,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });

    } catch (error: any) {
      logger.error('Failed to fetch orders', { error: error.message });
      return reply.status(500).send({
        error: 'Failed to fetch orders',
        message: error.message
      });
    }
  });

  /**
   * GET /api/health
   * Health check endpoint
   */
  fastify.get('/api/health', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
}
