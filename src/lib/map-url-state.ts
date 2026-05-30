/**
 * Map URL state — serialize/deserialize map position to URL search params.
 *
 * URL param scheme (compact):
 *   z   = zoom (integer)
 *   lat = center latitude (4 decimal places, ~11m precision)
 *   lng = center longitude (4 decimal places)
 *   b   = bounds as "swLat,swLng,neLat,neLng" (4 decimal each)
 */

// Decoupled from Leaflet to ensure SSR safety.
// We use simple objects instead of L.LatLngBounds instances.
export interface SimpleBounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

const PARAM_ZOOM = 'z';
const PARAM_LAT = 'lat';
const PARAM_LNG = 'lng';
const PARAM_BOUNDS = 'b';

const DECIMAL_PLACES = 4;

export interface MapState {
  center: { lat: number; lng: number };
  zoom: number;
  bounds?: SimpleBounds | null;
}

/**
 * Serialize map state to URLSearchParams string.
 * Returns a query string like "lat=4.6097&lng=-74.0817&z=6".
 */
export function serializeMapParams(mapState: MapState): string {
  const params = new URLSearchParams();

  params.set(PARAM_LAT, mapState.center.lat.toFixed(DECIMAL_PLACES));
  params.set(PARAM_LNG, mapState.center.lng.toFixed(DECIMAL_PLACES));
  params.set(PARAM_ZOOM, mapState.zoom.toString());

  if (mapState.bounds) {
    const sw = mapState.bounds.sw;
    const ne = mapState.bounds.ne;
    const boundsStr = [
      sw.lat.toFixed(DECIMAL_PLACES),
      sw.lng.toFixed(DECIMAL_PLACES),
      ne.lat.toFixed(DECIMAL_PLACES),
      ne.lng.toFixed(DECIMAL_PLACES),
    ].join(',');
    params.set(PARAM_BOUNDS, boundsStr);
  }

  return params.toString();
}

/**
 * Deserialize URLSearchParams back to MapState.
 * Returns null if required params (lat, lng, z) are missing or invalid.
 */
export function deserializeMapParams(
  searchParams: URLSearchParams
): MapState | null {
  const latRaw = searchParams.get(PARAM_LAT);
  const lngRaw = searchParams.get(PARAM_LNG);
  const zoomRaw = searchParams.get(PARAM_ZOOM);

  if (!latRaw || !lngRaw || !zoomRaw) return null;

  const lat = parseFloat(latRaw);
  const lng = parseFloat(lngRaw);
  const zoom = parseInt(zoomRaw, 10);

  if (isNaN(lat) || isNaN(lng) || isNaN(zoom)) return null;

  // Bounds are optional
  let bounds: SimpleBounds | null = null;
  const boundsRaw = searchParams.get(PARAM_BOUNDS);
  if (boundsRaw) {
    const parts = boundsRaw.split(',').map(Number);
    if (
      parts.length === 4 &&
      parts.every((n) => !isNaN(n))
    ) {
      bounds = {
        sw: { lat: parts[0], lng: parts[1] },
        ne: { lat: parts[2], lng: parts[3] },
      };
    }
  }

  return { center: { lat, lng }, zoom, bounds };
}

/**
 * Compute approximate area of a SimpleBounds in degree².
 * Used for comparing bounds changes.
 */
export function boundsArea(bounds: SimpleBounds): number {
  const { sw, ne } = bounds;
  return (ne.lat - sw.lat) * (ne.lng - sw.lng);
}

/**
 * Check if two bounds differ by more than the given threshold.
 *
 * Threshold is a ratio (0–1):
 *   0.2 = 20% change → triggers re-search per spec.
 *
 * Handles edge cases:
 *   - Both areas zero → no change (false)
 *   - One area zero, other non-zero → changed (true)
 */
export function boundsChangedOverThreshold(
  b1: SimpleBounds,
  b2: SimpleBounds,
  threshold: number
): boolean {
  const area1 = boundsArea(b1);
  const area2 = boundsArea(b2);

  // Both zero: no meaningful change
  if (area1 === 0 && area2 === 0) return false;

  // One is zero while the other has area: definite change
  if (area1 === 0 || area2 === 0) return true;

  const change = Math.abs(area2 - area1) / Math.max(area1, area2);
  return change > threshold;
}
