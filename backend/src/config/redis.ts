import Redis from 'ioredis';
import { logger } from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 3) {
      logger.error('Redis: máximo de reintentos alcanzado, dejando de reconectar');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on('connect', () => {
  logger.info('Redis conectado');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis error de conexión');
});
