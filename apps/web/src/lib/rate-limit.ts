/**
 * Simple Redis-based rate limiter for API routes.
 * Uses sliding window counter per IP address.
 */
import redis from './redis';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Check if a request is within rate limits.
 * @param identifier - Unique key (e.g., IP address or userId)
 * @param limit - Max requests allowed in the window
 * @param windowSeconds - Time window in seconds
 */
export async function rateLimit(
  identifier: string,
  limit: number = 30,
  windowSeconds: number = 60,
): Promise<RateLimitResult> {
  const key = `rl:${identifier}`;
  const now = Math.floor(Date.now() / 1000);

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();

    const count = (results?.[0]?.[1] as number) || 0;
    const ttl = (results?.[1]?.[1] as number) || -1;

    // Set expiry on first request
    if (ttl === -1) {
      await redis.expire(key, windowSeconds);
    }

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetInSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  } catch {
    // If Redis is down, allow the request (fail open)
    return { allowed: true, remaining: limit, resetInSeconds: windowSeconds };
  }
}

/**
 * Get the client IP from a request (works behind proxies).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return '127.0.0.1';
}
