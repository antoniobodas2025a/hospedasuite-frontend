'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { geocodeLocation } from '@/lib/geocoding';

interface Hotel {
  id: string;
  location: string;
  address?: string;
}

interface MapTransitionControllerProps {
  hotels: Hotel[];
  centerLocation?: string;
  transitionDuration?: number;
}

/**
 * MapTransitionController — Handles smooth map transitions.
 *
 * Triggers flyTo or fitBounds animations when:
 * - Hotels change (fitBounds to show all markers)
 * - centerLocation changes (flyTo that location)
 * - Markers are added/removed (smooth pan)
 *
 * Uses Leaflet's built-in easing for Mac 2026 spring-like feel.
 */
export default function MapTransitionController({
  hotels,
  centerLocation,
  transitionDuration = 1.2,
}: MapTransitionControllerProps) {
  const map = useMap();
  const lastHotelIdsRef = useRef<Set<string>>(new Set());
  const isInitialMount = useRef(true);

  // Transition 1: flyTo when centerLocation changes
  useEffect(() => {
    if (!centerLocation) return;

    let cancelled = false;

    const flyToLocation = async () => {
      const result = await geocodeLocation(centerLocation);
      if (cancelled || !result) return;

      map.flyTo([result.lat, result.lng], 12, {
        duration: transitionDuration,
        easeLinearity: 0.25,
      });
    };

    flyToLocation();

    return () => {
      cancelled = true;
    };
  }, [centerLocation, map, transitionDuration]);

  // Transition 2: fitBounds when hotels change
  useEffect(() => {
    const currentIds = new Set(hotels.map((h) => h.id));
    const previousIds = lastHotelIdsRef.current;

    // Skip on initial mount (let markers load first)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastHotelIdsRef.current = currentIds;
      return;
    }

    // Only transition if the hotel set actually changed
    const hasChanged =
      currentIds.size !== previousIds.size ||
      [...currentIds].some((id) => !previousIds.has(id));

    if (!hasChanged) {
      lastHotelIdsRef.current = currentIds;
      return;
    }

    lastHotelIdsRef.current = currentIds;

    // Wait a tick for markers to render, then fitBounds
    const timeoutId = setTimeout(() => {
      const allLayers = map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          return layer;
        }
        return null;
      });

      const markers: L.Marker[] = [];
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          markers.push(layer);
        }
      });

      if (markers.length === 0) return;

      const group = L.featureGroup(markers);
      map.flyToBounds(group.getBounds(), {
        padding: [50, 50],
        duration: transitionDuration,
        easeLinearity: 0.25,
        maxZoom: 14,
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [hotels, map, transitionDuration]);

  return null;
}
