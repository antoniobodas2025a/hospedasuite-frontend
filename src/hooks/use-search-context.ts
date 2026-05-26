/**
 * SearchContextManager — URL sync + sessionStorage backup for OTA search.
 *
 * Ensures search context (location, dates, guests, category, filters)
 * survives navigation, page refresh, and even tab close/reopen.
 *
 * Pattern: URL as source of truth + sessionStorage as fallback.
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export interface SearchContext {
  location: string | null;
  checkin: string | null;
  checkout: string | null;
  guests: number;
  category: string;
  search: string;
  maxPrice: number | null;
  minBeds: number | null;
  amenities: string[];
}

const STORAGE_KEY = 'hospedasuite_search_context';
const STORAGE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const SEARCH_PARAMS = [
  'location', 'checkin', 'checkout', 'guests',
  'category', 'search', 'max_price', 'min_beds', 'amenities',
] as const;

/**
 * Parse URLSearchParams into a SearchContext object.
 */
export function parseSearchContext(params: URLSearchParams): SearchContext {
  return {
    location: params.get('location') || null,
    checkin: params.get('checkin') || null,
    checkout: params.get('checkout') || null,
    guests: Number(params.get('guests')) || 1,
    category: params.get('category') || 'all',
    search: params.get('search') || '',
    maxPrice: params.get('max_price') ? Number(params.get('max_price')) : null,
    minBeds: params.get('min_beds') ? Number(params.get('min_beds')) : null,
    amenities: params.get('amenities') ? params.get('amenities')!.split(',') : [],
  };
}

/**
 * Serialize SearchContext into URLSearchParams.
 */
export function serializeSearchContext(ctx: Partial<SearchContext>): URLSearchParams {
  const params = new URLSearchParams();
  if (ctx.location) params.set('location', ctx.location);
  if (ctx.checkin) params.set('checkin', ctx.checkin);
  if (ctx.checkout) params.set('checkout', ctx.checkout);
  if (ctx.guests && ctx.guests > 1) params.set('guests', ctx.guests.toString());
  if (ctx.category && ctx.category !== 'all') params.set('category', ctx.category);
  if (ctx.search) params.set('search', ctx.search);
  if (ctx.maxPrice) params.set('max_price', ctx.maxPrice.toString());
  if (ctx.minBeds) params.set('min_beds', ctx.minBeds.toString());
  if (ctx.amenities && ctx.amenities.length > 0) params.set('amenities', ctx.amenities.join(','));
  return params;
}

/**
 * Save search context to sessionStorage with TTL.
 */
function saveToSessionStorage(ctx: SearchContext): void {
  try {
    const payload = {
      ...ctx,
      _timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be disabled or full — silently ignore
  }
}

/**
 * Restore search context from sessionStorage if within TTL.
 */
function restoreFromSessionStorage(): SearchContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const payload = JSON.parse(raw);
    const age = Date.now() - (payload._timestamp || 0);
    if (age > STORAGE_TTL) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      location: payload.location || null,
      checkin: payload.checkin || null,
      checkout: payload.checkout || null,
      guests: payload.guests || 1,
      category: payload.category || 'all',
      search: payload.search || '',
      maxPrice: payload.maxPrice || null,
      minBeds: payload.minBeds || null,
      amenities: payload.amenities || [],
    };
  } catch {
    return null;
  }
}

/**
 * Check if a SearchContext is empty (all default values).
 */
export function isEmptyContext(ctx: SearchContext): boolean {
  return (
    !ctx.location &&
    !ctx.checkin &&
    !ctx.checkout &&
    ctx.guests <= 1 &&
    ctx.category === 'all' &&
    !ctx.search &&
    !ctx.maxPrice &&
    !ctx.minBeds &&
    ctx.amenities.length === 0
  );
}

/**
 * React hook for managing search context with URL sync + sessionStorage backup.
 *
 * Usage:
 *   const { context, updateContext, clearContext, hasContext } = useSearchContext();
 */
export function useSearchContext() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isRestored = useRef(false);

  // Parse current context from URL
  const context = parseSearchContext(searchParams);

  // Restore from sessionStorage on mount if URL is empty
  useEffect(() => {
    if (isRestored.current) return;
    isRestored.current = true;

    const hasUrlContext = SEARCH_PARAMS.some(key => searchParams.has(key));
    if (!hasUrlContext) {
      const restored = restoreFromSessionStorage();
      if (restored && !isEmptyContext(restored)) {
        const params = serializeSearchContext(restored);
        const query = params.toString();
        if (query) {
          router.replace(`${pathname}?${query}`, { scroll: false });
        }
      }
    }
  }, [searchParams, router, pathname]);

  // Save to sessionStorage whenever context changes
  useEffect(() => {
    if (!isEmptyContext(context)) {
      saveToSessionStorage(context);
    }
  }, [context]);

  // Update context and push to URL
  const updateContext = useCallback(
    (updates: Partial<SearchContext>, replace = false) => {
      const merged = { ...context, ...updates };
      const params = serializeSearchContext(merged);
      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;

      if (replace) {
        router.replace(url, { scroll: false });
      } else {
        router.push(url, { scroll: false });
      }
    },
    [context, pathname, router]
  );

  // Clear context and sessionStorage
  const clearContext = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  return {
    context,
    updateContext,
    clearContext,
    hasContext: !isEmptyContext(context),
  };
}
