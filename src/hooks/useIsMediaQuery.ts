'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current viewport matches a media query.
 * Handles SSR by defaulting to `false` and detecting on mount.
 * Avoids hydration mismatch by returning `undefined` until mounted.
 */
export function useIsMediaQuery(query: string): boolean | undefined {
  const [matches, setMatches] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Convenience hook: returns true when viewport is below the given breakpoint.
 * Returns `undefined` during SSR to avoid hydration mismatch.
 */
export function useIsMobile(breakpoint = 768): boolean | undefined {
  return useIsMediaQuery(`(max-width: ${breakpoint - 1}px)`);
}
