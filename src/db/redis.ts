import Redis from 'ioredis';
import { config } from '../config';
import { Logger } from '../utils/logger';

const logger = new Logger('Redis');

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('Redis connection error', { error: error.message });
});

redis.on('ready', () => {
  logger.info('Redis is ready to accept commands');
});

export const disconnectRedis = async (): Promise<void> => {
  try {
    await redis.quit();
    logger.info('Redis disconnected successfully');
  } catch (error) {
    logger.error('Failed to disconnect from Redis', { error });
  }
};
