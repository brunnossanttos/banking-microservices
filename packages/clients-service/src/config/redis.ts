import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  return redis;
}

export function connectRedis(): Promise<void> {
  return new Promise((resolve, reject) => {
    redis = new Redis({
      host: env.redis.host,
      port: env.redis.port,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true,
    });

    redis.on('error', err => {
      logger.error('Redis connection error', err);
    });

    redis
      .connect()
      .then(() => {
        logger.info('Redis connected successfully');
        resolve();
      })
      .catch(err => {
        logger.warn('Redis connection failed');
        redis = null;
        reject(err);
      });
  });
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    logger.info('Redis connection closed');
  }
}
