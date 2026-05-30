/**
 * Unit tests for TokenBucket rate limiter.
 */
import { describe, it, expect } from 'vitest';
import { TokenBucket } from '@/lib/rate-limiter';

describe('TokenBucket', () => {
  it('allows consumption within capacity', () => {
    const bucket = new TokenBucket(5, 5, 1_000);
    for (let i = 0; i < 5; i++) {
      expect(bucket.tryConsume()).toBe(true);
    }
  });

  it('blocks when all tokens are consumed', () => {
    const bucket = new TokenBucket(2, 2, 10_000); // slow refill
    expect(bucket.tryConsume()).toBe(true);
    expect(bucket.tryConsume()).toBe(true);
    expect(bucket.tryConsume()).toBe(false); // should block
  });

  it('refills tokens over time', async () => {
    const bucket = new TokenBucket(1, 1, 100); // 1 token per 100ms

    expect(bucket.tryConsume()).toBe(true);  // consume the 1 token
    expect(bucket.tryConsume()).toBe(false); // blocked

    // Wait for refill
    await new Promise((r) => setTimeout(r, 150));

    expect(bucket.tryConsume()).toBe(true);  // refilled
  });

  it('does not exceed capacity after long wait', async () => {
    const bucket = new TokenBucket(3, 10, 100); // cap at 3

    // Wait for potential over-refill
    await new Promise((r) => setTimeout(r, 500));

    // Should only have 3 tokens (capacity cap)
    expect(bucket.tryConsume()).toBe(true);
    expect(bucket.tryConsume()).toBe(true);
    expect(bucket.tryConsume()).toBe(true);
    expect(bucket.tryConsume()).toBe(false);
  });
});
