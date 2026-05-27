/**
 * SearchCache — Client-side cache for OTA search results.
 *
 * Implements stale-while-revalidate pattern:
 * - Returns cached results immediately (stale)
 * - Fetches fresh data in background (revalidate)
 * - TTL: 60 seconds
 *
 * Reduces Supabase load and improves perceived performance.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

const CACHE_TTL = 60 * 1000; // 60 seconds
const MAX_CACHE_SIZE = 20; // Max entries to prevent memory leaks

class SearchCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Generate a cache key from search parameters.
   */
  private makeKey(params: {
    page: number;
    limit: number;
    category: string;
    search: string;
    location: string;
    checkin?: string;
    checkout?: string;
    guests?: number;
  }): string {
    return JSON.stringify(params);
  }

  /**
   * Get cached data if within TTL.
   * Returns null if expired or not found.
   */
  get<T>(params: Parameters<typeof this.makeKey>[0]): T | null {
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
   */
  set<T>(params: Parameters<typeof this.makeKey>[0], data: T): void {
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
  }

  /**
   * Invalidate cache entries matching a pattern.
   * Use when hotel status changes or new hotels are added.
   */
  invalidate(pattern?: { category?: string; location?: string }): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const [key, entry] of this.cache.entries()) {
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
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  /**
   * Get cache stats for debugging.
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const searchCache = new SearchCache();

/**
 * Hook for stale-while-revalidate pattern.
 *
 * Usage:
 *   const { data, isLoading, isStale } = useSearchCache(fetchFn, params);
 */
export function createCachedFetcher<T>(
  fetchFn: (params: any) => Promise<T>,
  cache: SearchCache = searchCache
) {
  return async (params: any): Promise<{ data: T | null; isStale: boolean }> => {
    // Try cache first
    const cached = cache.get<T>(params);
    if (cached) {
      // Return stale data immediately, revalidate in background
      fetchFn(params).then((freshData) => {
        cache.set(params, freshData);
      }).catch(() => {
        // Silently ignore revalidation errors
      });

      return { data: cached, isStale: true };
    }

    // Cache miss — fetch fresh
    const freshData = await fetchFn(params);
    cache.set(params, freshData);

    return { data: freshData, isStale: false };
  };
}
