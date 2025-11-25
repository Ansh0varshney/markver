import { Queue, QueueEvents } from 'bullmq';
import { redis } from '../../db/redis';
import { config } from '../../config';
import { CreateOrderRequest } from '../../types/order.types';
import { Logger } from '../../utils/logger';

const logger = new Logger('OrderQueue');

export interface OrderJobData extends CreateOrderRequest {
  orderId: string;
}

export const orderQueue = new Queue<OrderJobData>('order-execution', {
  connection: redis,
  defaultJobOptions: {
    attempts: config.queue.maxRetries,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600 // Keep completed jobs for 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600 // Keep failed jobs for 7 days
    }
  }
});

export const orderQueueEvents = new QueueEvents('order-execution', {
  connection: redis
});

// Queue event listeners
orderQueue.on('error', (error) => {
  logger.error('Queue error', { error: error.message });
});

orderQueueEvents.on('completed', ({ jobId }) => {
  logger.info('Job completed', { jobId });
});

orderQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('Job failed', { jobId, failedReason });
});

orderQueueEvents.on('active', ({ jobId }) => {
  logger.info('Job started processing', { jobId });
});

/**
 * Add order to the queue
 */
export async function addOrderToQueue(orderData: OrderJobData): Promise<void> {
  try {
    await orderQueue.add('execute-order', orderData, {
      jobId: orderData.orderId
    });
    logger.info('Order added to queue', { orderId: orderData.orderId });
  } catch (error) {
    logger.error('Failed to add order to queue', { orderId: orderData.orderId, error });
    throw error;
  }
}

/**
 * Get queue metrics
 */
export async function getQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    orderQueue.getWaitingCount(),
    orderQueue.getActiveCount(),
    orderQueue.getCompletedCount(),
    orderQueue.getFailedCount(),
    orderQueue.getDelayedCount()
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed
  };
}

/**
 * Clean old jobs from the queue
 */
export async function cleanQueue(): Promise<void> {
  await orderQueue.clean(24 * 3600 * 1000, 1000, 'completed');
  await orderQueue.clean(7 * 24 * 3600 * 1000, 5000, 'failed');
  logger.info('Queue cleaned');
}

/**
 * Graceful shutdown
 */
export async function closeQueue(): Promise<void> {
  await orderQueue.close();
  await orderQueueEvents.close();
  logger.info('Queue closed');
}
