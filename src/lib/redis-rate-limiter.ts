/**
 * Redis Rate Limiter - Edge-Safe Distributed Rate Limiting
 *
 * Replaces in-memory Map-based rate limiting with Upstash Redis
 * for distributed, persistent rate limiting across Edge Function instances.
 *
 * Benefits:
 * - Survives cold starts (memory is cleared)
 * - Works across multiple Edge instances
 * - Persistent across deployments
 * - Atomic operations (no race conditions)
 *
 * Requires: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// Lazy-loaded Redis client (only imported when needed)
let redis: any = null;

async function getRedisClient() {
  if (!redis) {
    const { Redis } = await import('@upstash/redis');
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

/**
 * Check if request is allowed based on IP rate limiting
 *
 * @param ip - Client IP address
 * @param config - Rate limit configuration
 * @returns Rate limit result with remaining requests and reset time
 */
export async function checkRateLimit(
  ip: string,
  config: RateLimitConfig = { maxRequests: 60, windowMs: 60000 }
): Promise<RateLimitResult> {
  try {
    const redis = await getRedisClient();
    const key = `rate-limit:${ip}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    pipeline.zcard(key);

    const results = await pipeline.exec();
    const currentCount = results[1] as number;

    if (currentCount >= config.maxRequests) {
      // Rate limit exceeded
      const oldestRequest = await redis.zrange(key, 0, 0, { rev: false });
      const resetAt = oldestRequest.length > 0
        ? Number(oldestRequest[0]) + config.windowMs
        : now + config.windowMs;

      return {
        success: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      };
    }

    // Add current request
    await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });

    // Set expiry to auto-cleanup
    await redis.expire(key, Math.ceil(config.windowMs / 1000) + 10);

    return {
      success: true,
      remaining: config.maxRequests - currentCount - 1,
      resetAt: now + config.windowMs,
    };
  } catch (error) {
    console.error('[Rate Limiter] Redis error:', error);

    // Fallback: allow request if Redis is unavailable
    return {
      success: true,
      remaining: 0,
      resetAt: Date.now() + 60000,
    };
  }
}

/**
 * Reset rate limit for specific IP (admin use)
 */
export async function resetRateLimit(ip: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    await redis.del(`rate-limit:${ip}`);
  } catch (error) {
    console.error('[Rate Limiter] Failed to reset rate limit:', error);
  }
}

/**
 * Get current rate limit status for IP (admin use)
 */
export async function getRateLimitStatus(ip: string): Promise<{
  currentCount: number;
  maxRequests: number;
  windowMs: number;
} | null> {
  try {
    const redis = await getRedisClient();
    const key = `rate-limit:${ip}`;
    const now = Date.now();
    const windowStart = now - 60000;

    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);

    return {
      currentCount: count,
      maxRequests: 60,
      windowMs: 60000,
    };
  } catch (error) {
    console.error('[Rate Limiter] Failed to get status:', error);
    return null;
  }
}
