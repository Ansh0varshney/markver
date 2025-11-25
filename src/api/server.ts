import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { ordersRoute } from './routes/orders.route';
import { config } from '../config';
import { Logger } from '../utils/logger';

const logger = new Logger('Server');

export async function createServer() {
  const fastify = Fastify({
    logger: false, // Using custom logger
    requestTimeout: 30000
  });

  // Register WebSocket support
  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576 // 1MB
    }
  });

  // Register routes
  await fastify.register(ordersRoute);

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    logger.error('Request error', {
      method: request.method,
      url: request.url,
      error: error.message
    });

    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal server error',
      statusCode: error.statusCode || 500
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Route not found',
      path: request.url
    });
  });

  return fastify;
}

export async function startServer() {
  try {
    const fastify = await createServer();

    await fastify.listen({
      port: config.server.port,
      host: '0.0.0.0'
    });

    logger.info(`Server started on port ${config.server.port}`);
    logger.info(`Health check: http://localhost:${config.server.port}/api/health`);

    return fastify;
  } catch (error) {
    logger.error('Failed to start server', { error });
    throw error;
  }
}
