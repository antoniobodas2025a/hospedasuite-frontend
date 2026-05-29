/**
 * Bounds Filter Utility — Filter hotels by visible map area.
 *
 * Since hotels don't have lat/lng stored in the database, we use the
 * GeoCacheManager to resolve coordinates for each hotel's location.
 *
 * Algorithm:
 * 1. For each hotel, try to get coords from GeoCacheManager
 * 2. If coords exist, check if within bounds
 * 3. Return filtered hotel IDs
 *
 * Note: Hotels without resolvable coords are excluded from bounds filtering
 * (they'll still appear in the full list search).
 */

import { getCachedCoords } from './geo-cache';
import L from 'leaflet';

export interface HotelWithLocation {
  id: string;
  location: string;
  address?: string;
}

export interface BoundsFilterResult {
  /** Hotel IDs that are within the visible bounds */
  visibleIds: Set<string>;
  /** Hotel IDs that couldn't be geocoded (no coords available) */
  unresolvableIds: Set<string>;
  /** Total hotels processed */
  total: number;
  /** Number of hotels within bounds */
  visibleCount: number;
  /** Number of hotels outside bounds */
  outsideCount: number;
}

/**
 * Resolve coordinates for a hotel using GeoCacheManager.
 *
 * Tries location first, then address. Returns null if neither resolves.
 */
function resolveHotelCoords(hotel: HotelWithLocation): { lat: number; lng: number } | null {
  // Try location (city/neighborhood)
  if (hotel.location) {
    const coords = getCachedCoords(hotel.location);
    if (coords) {
      return { lat: coords.lat, lng: coords.lng };
    }
  }

  // Try address
  if (hotel.address) {
    const coords = getCachedCoords(hotel.address);
    if (coords) {
      return { lat: coords.lat, lng: coords.lng };
    }
  }

  return null;
}

/**
 * Filter hotels by visible map bounds.
 *
 * @param hotels - List of hotels with location info
 * @param bounds - Current map visible bounds
 * @returns BoundsFilterResult with visible IDs and stats
 */
export function filterHotelsByBounds(
  hotels: HotelWithLocation[],
  bounds: L.LatLngBounds
): BoundsFilterResult {
  const visibleIds = new Set<string>();
  const unresolvableIds = new Set<string>();
  let outsideCount = 0;

  for (const hotel of hotels) {
    const coords = resolveHotelCoords(hotel);

    if (!coords) {
      // Can't filter without coords — mark as unresolvable
      unresolvableIds.add(hotel.id);
      continue;
    }

    // Check if coords are within bounds
    if (bounds.contains([coords.lat, coords.lng])) {
      visibleIds.add(hotel.id);
    } else {
      outsideCount++;
    }
  }

  return {
    visibleIds,
    unresolvableIds,
    total: hotels.length,
    visibleCount: visibleIds.size,
    outsideCount,
  };
}

/**
 * Check if a single hotel is within bounds.
 *
 * @param hotel - Hotel with location info
 * @param bounds - Map visible bounds
 * @returns true if hotel is within bounds, false if outside, null if unresolvable
 */
export function isHotelInBounds(
  hotel: HotelWithLocation,
  bounds: L.LatLngBounds
): boolean | null {
  const coords = resolveHotelCoords(hotel);
  if (!coords) return null;
  return bounds.contains([coords.lat, coords.lng]);
}

/**
 * Get bounds filter summary for UI display.
 *
 * @param result - BoundsFilterResult from filterHotelsByBounds
 * @returns Human-readable summary string
 */
export function getBoundsFilterSummary(result: BoundsFilterResult): string {
  const { visibleCount, total, unresolvableIds } = result;

  if (unresolvableIds.size === total) {
    return 'No se pueden filtrar por ubicación (sin coordenadas)';
  }

  if (visibleCount === total - unresolvableIds.size) {
    return `Todos los alojamientos visibles (${visibleCount})`;
  }

  return `${visibleCount} de ${total - unresolvableIds.size} alojamientos en esta zona`;
}
