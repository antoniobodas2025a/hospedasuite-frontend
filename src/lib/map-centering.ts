/**
 * Map Centering — Pure resolution logic for MapTransitionController.
 *
 * Decides whether to trigger flyTo based on geocoding result.
 * Extracted from MapTransitionController for testability.
 */

import type { GeoResult } from './geocoding';

export type { GeoResult };

export interface CenterResolveResult {
  fly: boolean;
  target: { lat: number; lng: number } | null;
  error: string | null;
}

/**
 * Resolve a location string into map centering coordinates.
 *
 * Calls the provided geocode function and returns a decision:
 * - `fly: true` + `target` when geocoding succeeds
 * - `fly: false` + `error` when geocoding fails (for user feedback, S2)
 */
export interface CenterHandlers {
  onError?: (message: string) => void;
}

/**
 * Handle the geocoding result — dispatches to callbacks.
 *
 * - Calls onError when geocoding fails (S2: user feedback)
 * - Does nothing when fly succeeds (MapTransitionController handles flyTo)
 */
export function handleCenterResult(
  result: CenterResolveResult,
  handlers: CenterHandlers,
): void {
  if (!result.fly && result.error) {
    handlers.onError?.(result.error);
  }
}

// ─── Resolution ─────────────────────────────────────────────────────────────

export async function resolveCenterLocation(
  location: string,
  geocodeFn: (q: string) => Promise<GeoResult | null>,
): Promise<CenterResolveResult> {
  const result = await geocodeFn(location);

  if (result) {
    return {
      fly: true,
      target: { lat: result.lat, lng: result.lng },
      error: null,
    };
  }

  return {
    fly: false,
    target: null,
    error: 'No se pudo determinar la ubicación en el mapa',
  };
}
