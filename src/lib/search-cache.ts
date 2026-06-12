/**
 * SearchCache — Client-side cache for Channel search results.
 *
 * Implements stale-while-revalidate pattern with request deduplication:
 * - Returns cached results immediately (stale)
 * - Fetches fresh data in background (revalidate)
 * - Deduplicates parallel refreshes for the same key
 * - TTL: 120 seconds (reduced server load)
 * - Pre-warms popular destinations for instant first load
 *
 * Reduces Supabase load and improves perceived performance.
 */

export interface CacheParams {
  page: number;
  limit: number;
  category: string;
  search: string;
  location: string;
  checkin?: string;
  checkout?: string;
  guests?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

const CACHE_TTL = 120 * 1000; // 120 seconds (increased from 60s)
const MAX_CACHE_SIZE = 30; // Max entries (increased from 20)

class SearchCache {
  private cache = new Map<string, CacheEntry<any>>();
  /** Tracks in-flight refresh promises to prevent parallel re-fetches for the same key */
  private refreshing = new Map<string, Promise<any>>();

  /**
   * Generate a cache key from search parameters.
   * Includes all ranking-relevant params for cache correctness.
   */
  private makeKey(params: CacheParams): string {
    return JSON.stringify(params);
  }

  /**
   * Get cached data if within TTL.
   * Returns null if expired or not found.
   */
  get<T>(params: CacheParams): T | null {
    const key = this.makeKey(params);
    const entry = this.cache.get(key);

    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache.
   * Evicts oldest entry if cache is full.
   * Clears any in-flight refresh for this key (refresh completed).
   */
  set<T>(params: CacheParams, data: T): void {
    const key = this.makeKey(params);

    // Evict oldest if full
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key,
    });

    // Clear in-flight refresh tracker
    this.refreshing.delete(key);
  }

  /**
   * Check if a refresh is already in progress for this key.
   * Returns the in-flight promise if so, null otherwise.
   * Used for request deduplication: callers should await the existing
   * promise instead of firing another parallel request.
   */
  isRefreshing(key: string): Promise<any> | null {
    return this.refreshing.get(key) ?? null;
  }

  /**
   * Register an in-flight refresh promise for this key.
   * Call before starting a background fetch to prevent duplicates.
   */
  markRefreshing(key: string, promise: Promise<any>): void {
    this.refreshing.set(key, promise);
  }

  /**
   * Invalidate all cache entries.
   * Use when new hotels are created or hotel status changes.
   */
  invalidateAll(): void {
    this.cache.clear();
    this.refreshing.clear();
  }

  /**
   * Invalidate cache entries matching a pattern.
   * Use when hotel status changes or new hotels are added.
   */
  invalidate(pattern?: { category?: string; location?: string }): void {
    if (!pattern) {
      this.invalidateAll();
      return;
    }

    for (const [key] of this.cache.entries()) {
      try {
        const params = JSON.parse(key);
        let shouldDelete = false;

        if (pattern.category && params.category === pattern.category) {
          shouldDelete = true;
        }
        if (pattern.location && params.location === pattern.location) {
          shouldDelete = true;
        }

        if (shouldDelete) {
          this.cache.delete(key);
          this.refreshing.delete(key);
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  /**
   * Pre-warm cache with popular destination results.
   * Accepts a map of cache params → data to prime the cache.
   * Called after initial page load to seed common searches.
   */
  preWarm(entries: Map<string, { params: CacheParams; data: any }>): void {
    for (const [, { params, data }] of entries) {
      const key = this.makeKey(params);
      // Only prime if not already cached
      if (!this.get(params)) {
        this.set(params, data);
      }
    }
  }

  /**
   * Pre-warm with a single entry (convenience method).
   */
  preWarmOne(params: CacheParams, data: any): void {
    if (!this.get(params)) {
      this.set(params, data);
    }
  }

  /**
   * Get cache stats for debugging.
   */
  getStats(): { size: number; refreshing: number; keys: string[] } {
    return {
      size: this.cache.size,
      refreshing: this.refreshing.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const searchCache = new SearchCache();

/**
 * Factory for stale-while-revalidate fetcher with request deduplication.
 *
 * Usage:
 *   const fetcher = createCachedFetcher(fetchFn);
 *   const { data, isStale } = await fetcher(params);
 *
 * Features:
 *   - Stale cache returned immediately while background refresh runs
 *   - Parallel requests for the same key are deduplicated
 *   - Failed refreshes don't break the current render
 */
export function createCachedFetcher<T>(
  fetchFn: (params: CacheParams) => Promise<T>,
  cache: SearchCache = searchCache,
) {
  return async (params: CacheParams): Promise<{ data: T | null; isStale: boolean }> => {
    // Try cache first
    const cached = cache.get<T>(params);
    if (cached) {
      // Return stale data immediately, then revalidate in background
      const key = JSON.stringify(params);

      // Check if a refresh is already in-flight for this key
      const existingRefresh = cache.isRefreshing(key);
      if (!existingRefresh) {
        const refreshPromise = fetchFn(params).then((freshData) => {
          cache.set(params, freshData);
        }).catch(() => {
          // Silently ignore revalidation errors
        });
        cache.markRefreshing(key, refreshPromise);
      }

      return { data: cached, isStale: true };
    }

    // Cache miss — fetch fresh
    const freshData = await fetchFn(params);
    cache.set(params, freshData);

    return { data: freshData, isStale: false };
  };
}
