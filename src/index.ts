import { startServer } from './api/server';
import { connectDatabase, disconnectDatabase } from './db/prisma.client';
import { disconnectRedis } from './db/redis';
import { closeQueue } from './services/queue/order.queue';
import { closeWorker } from './workers/order.worker';
import { Logger } from './utils/logger';

const logger = new Logger('Main');

async function bootstrap() {
  try {
    logger.info('Starting Markver Order Execution Engine...');

    // Connect to database
    await connectDatabase();

    // Import worker to start it
    await import('./workers/order.worker');

    // Start server
    const server = await startServer();

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Stop accepting new connections
        await server.close();
        logger.info('Server closed');

        // Close worker
        await closeWorker();

        // Close queue
        await closeQueue();

        // Disconnect from databases
        await disconnectDatabase();
        await disconnectRedis();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
}

bootstrap();
