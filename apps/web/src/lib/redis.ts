import Redis from 'ioredis';

if (!process.env.REDIS_URL && typeof window === 'undefined') {
  console.warn('⚠️  REDIS_URL not set — falling back to localhost:6379 (not suitable for production)');
}

const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
