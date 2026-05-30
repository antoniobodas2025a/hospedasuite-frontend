/**
 * In-memory Token Bucket Rate Limiter.
 *
 * Server-only singleton factory via getGlobalLimiter().
 * Pre-configured limiters:
 *   - MAPBOX_LIMITER:    10 req/sec
 *   - NOMINATIM_LIMITER:  1 req/sec
 */

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number,
    private refillInterval: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /** Consume one token. Returns false if rate limit exceeded. */
  tryConsume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.refillInterval) * this.refillRate;
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}

const buckets = new Map<string, TokenBucket>();

/**
 * Get or create a named TokenBucket singleton.
 * Shared across all modules in the same process.
 */
export function getGlobalLimiter(
  name: string,
  capacity: number,
  refillRate: number,
  refillInterval: number,
): TokenBucket {
  if (!buckets.has(name)) {
    buckets.set(name, new TokenBucket(capacity, refillRate, refillInterval));
  }
  return buckets.get(name)!;
}

/** 10 requests per second for Mapbox Geocoding API (free tier: 100k/mes). */
export const MAPBOX_LIMITER = (): TokenBucket =>
  getGlobalLimiter('mapbox', 10, 10, 1_000);

/** 1 request per second for Nominatim (per OpenStreetMap ToS). */
export const NOMINATIM_LIMITER = (): TokenBucket =>
  getGlobalLimiter('nominatim', 1, 1, 1_000);
