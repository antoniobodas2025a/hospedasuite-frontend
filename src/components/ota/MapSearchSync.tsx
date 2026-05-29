'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { geocodeLocation } from '@/lib/geocoding';
import { useSharedMoveGuard } from '@/lib/use-shared-move-guard';
import { boundsChangedOverThreshold } from '@/lib/map-url-state';

interface MapSearchSyncProps {
  searchLocation?: string;
  onMapBoundsChange?: (bounds: L.LatLngBounds, center: L.LatLng, zoom: number) => void;
  onSearchAreaChange?: (areaName: string) => void;
  enableSearchOnMove?: boolean;
  moveDebounceMs?: number;
  /** Threshold ratio (0-1) for bounds change detection. Default 0.2 = 20%. */
  boundsThreshold?: number;
  /** Fired when bounds change exceeds threshold — signals "search this area". */
  onBoundsExceeded?: (bounds: L.LatLngBounds) => void;
}

/**
 * MapSearchSync — Bidirectional sync between search state and map state.
 *
 * Principles:
 * - Cognitive Reductionism: User sees one coherent view, not two modes
 * - Invisible IA: Sync happens automatically, no explicit "sync" button
 * - Organic Affordance: Map invites exploration; search updates naturally
 *
 * Directions:
 * 1. Search → Map: When location changes, flyTo that location
 * 2. Map → Search: When user pans/zooms, optionally trigger "search this area"
 * 3. Bounds tracking: Always track visible bounds for filtering hotels
 */
export default function MapSearchSync({
  searchLocation,
  onMapBoundsChange,
  onSearchAreaChange,
  enableSearchOnMove = false,
  moveDebounceMs = 1000,
  boundsThreshold = 0.2,
  onBoundsExceeded,
}: MapSearchSyncProps) {
  const map = useMap();
  const {
    isInternalMove,
    setInternalMove,
    clearInternalMove,
  } = useSharedMoveGuard();
  const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchBoundsRef = useRef<L.LatLngBounds | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Reverse geocode map center to get area name
  const reverseGeocodeCenter = useCallback(async (center: L.LatLng) => {
    if (isReverseGeocoding) return;
    
    setIsReverseGeocoding(true);
    try {
      // Use Nominatim reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${center.lat}&lon=${center.lng}&format=json&zoom=10`
      );
      const data = await response.json();
      
      if (data.address) {
        const areaName = 
          data.address.city ||
          data.address.town ||
          data.address.village ||
          data.address.county ||
          data.address.state;
        
        if (areaName && onSearchAreaChange) {
          onSearchAreaChange(areaName);
        }
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    } finally {
      setIsReverseGeocoding(false);
    }
  }, [onSearchAreaChange, isReverseGeocoding]);

  // Listen to map move/zoom events
  useEffect(() => {
    if (!map) return;

    const handleMoveEnd = () => {
      // Skip if this was an internal programmatic move (flyTo, fitBounds)
      if (isInternalMove.current) {
        clearInternalMove();
        return;
      }

      const bounds = map.getBounds();
      const center = map.getCenter();
      const zoom = map.getZoom();

      // PRD-006: Bounds threshold detection — fire onBoundsExceeded when
      // user pans/zooms beyond threshold from the last search bounds.
      const prev = lastSearchBoundsRef.current;
      if (!prev) {
        // First moveend after a search → establish baseline
        lastSearchBoundsRef.current = bounds;
      } else if (
        onBoundsExceeded &&
        boundsChangedOverThreshold(prev, bounds, boundsThreshold)
      ) {
        onBoundsExceeded(bounds);
      }

      // Notify bounds change (for filtering hotels)
      onMapBoundsChange?.(bounds, center, zoom);

      // Optional: reverse geocode and update search area
      if (enableSearchOnMove) {
        if (moveTimeoutRef.current) {
          clearTimeout(moveTimeoutRef.current);
        }

        moveTimeoutRef.current = setTimeout(() => {
          reverseGeocodeCenter(center);
        }, moveDebounceMs);
      }
    };

    const handleMoveStart = () => {
      // Clear pending reverse geocode on new move
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };

    map.on('movestart', handleMoveStart);
    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('movestart', handleMoveStart);
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, [map, onMapBoundsChange, onSearchAreaChange, enableSearchOnMove, moveDebounceMs, reverseGeocodeCenter, clearInternalMove, onBoundsExceeded, boundsThreshold]);

  // Sync: Search location → Map center
  useEffect(() => {
    if (!searchLocation || !map) return;

    // Reset bounds baseline on new search — next user pan establishes
    // a fresh baseline for threshold comparison.
    lastSearchBoundsRef.current = null;

    let cancelled = false;

    const flyToSearchLocation = async () => {
      setInternalMove();
      const result = await geocodeLocation(searchLocation);
      if (cancelled || !result) return;

      map.flyTo([result.lat, result.lng], 12, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    };

    flyToSearchLocation();

    return () => {
      cancelled = true;
    };
  }, [searchLocation, map, setInternalMove]);

  return null;
}
