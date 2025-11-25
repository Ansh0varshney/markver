import { Worker, Job } from 'bullmq';
import { redis } from '../db/redis';
import { config } from '../config';
import { orderExecutor } from '../services/execution/executor.service';
import { OrderJobData } from '../services/queue/order.queue';
import { Logger } from '../utils/logger';
import { calculateExponentialBackoff } from '../utils/helpers';

const logger = new Logger('OrderWorker');

/**
 * Worker that processes orders from the queue
 * Handles up to MAX_CONCURRENT_ORDERS orders concurrently
 */
export const orderWorker = new Worker<OrderJobData>(
  'order-execution',
  async (job: Job<OrderJobData>) => {
    const { orderId } = job.data;

    logger.info('Processing order', {
      orderId,
      attemptNumber: job.attemptsMade + 1,
      maxAttempts: config.queue.maxRetries
    });

    try {
      // Execute the order
      await orderExecutor.executeOrder(job.data);

      logger.info('Order processed successfully', { orderId });
      return { success: true, orderId };

    } catch (error: any) {
      logger.error('Order processing failed', {
        orderId,
        attempt: job.attemptsMade + 1,
        maxAttempts: config.queue.maxRetries,
        error: error.message
      });

      // If we've exhausted all retries, throw to mark as permanently failed
      if (job.attemptsMade + 1 >= config.queue.maxRetries) {
        logger.error('Order permanently failed after max retries', { orderId });
        throw new Error(`Order failed after ${config.queue.maxRetries} attempts: ${error.message}`);
      }

      // Calculate backoff delay for next retry
      const backoffDelay = calculateExponentialBackoff(job.attemptsMade);
      logger.info('Order will be retried', { orderId, backoffDelay, nextAttempt: job.attemptsMade + 2 });

      // Re-throw to trigger retry
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: config.queue.maxConcurrentOrders,
    limiter: {
      max: config.queue.ordersPerMinute,
      duration: 60000 // 1 minute
    }
  }
);

// Worker event listeners
orderWorker.on('completed', (job) => {
  logger.info('Worker completed job', { jobId: job.id });
});

orderWorker.on('failed', (job, error) => {
  if (job) {
    logger.error('Worker failed job', {
      jobId: job.id,
      orderId: job.data.orderId,
      error: error.message
    });
  }
});

orderWorker.on('error', (error) => {
  logger.error('Worker error', { error: error.message });
});

orderWorker.on('active', (job) => {
  logger.info('Worker started processing job', { jobId: job.id, orderId: job.data.orderId });
});

/**
 * Graceful shutdown
 */
export async function closeWorker(): Promise<void> {
  await orderWorker.close();
  logger.info('Worker closed');
}

logger.info('Order worker started', {
  concurrency: config.queue.maxConcurrentOrders,
  rateLimit: `${config.queue.ordersPerMinute} orders/minute`
});
