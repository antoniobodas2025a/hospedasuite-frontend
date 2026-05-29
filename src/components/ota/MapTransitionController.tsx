'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { geocodeLocation } from '@/lib/geocoding';
import { useSharedMoveGuard } from '@/lib/use-shared-move-guard';

interface Hotel {
  id: string;
  location: string;
  address?: string;
}

interface MapTransitionControllerProps {
  hotels: Hotel[];
  centerLocation?: string;
  selectedHotelId?: string;
  transitionDuration?: number;
}

/**
 * MapTransitionController — Handles smooth map transitions.
 *
 * Triggers flyTo or fitBounds animations when:
 * - Hotels change (fitBounds to show all markers)
 * - centerLocation changes (flyTo that location)
 * - selectedHotelId changes (flyTo that hotel's marker)
 * - Markers are added/removed (smooth pan)
 *
 * Uses Leaflet's built-in easing for Mac 2026 spring-like feel.
 */
export default function MapTransitionController({
  hotels,
  centerLocation,
  selectedHotelId = '',
  transitionDuration = 1.2,
}: MapTransitionControllerProps) {
  const map = useMap();
  const { setInternalMove } = useSharedMoveGuard();
  const lastHotelIdsRef = useRef<Set<string>>(new Set());
  const isInitialMount = useRef(true);

  // Transition 1: flyTo when centerLocation changes
  useEffect(() => {
    if (!centerLocation) return;

    let cancelled = false;

    const flyToLocation = async () => {
      const result = await geocodeLocation(centerLocation);
      if (cancelled || !result) return;

      setInternalMove();
      map.flyTo([result.lat, result.lng], 12, {
        duration: transitionDuration,
        easeLinearity: 0.25,
      });
    };

    flyToLocation();

    return () => {
      cancelled = true;
    };
  }, [centerLocation, map, transitionDuration, setInternalMove]);

  // Transition 3: flyTo selected hotel marker (Idea #2: hover hotel → zoom to marker)
  useEffect(() => {
    if (!selectedHotelId) return;

    const hotel = hotels.find((h) => h.id === selectedHotelId);
    if (!hotel) return;

    let cancelled = false;

    const flyToHotel = async () => {
      const query = hotel.location || hotel.address || '';
      if (!query) return;

      const result = await geocodeLocation(query);
      if (cancelled || !result) return;

      setInternalMove();
      map.flyTo([result.lat, result.lng], 14, {
        duration: 0.8,
        easeLinearity: 0.25,
      });
    };

    flyToHotel();

    return () => {
      cancelled = true;
    };
  }, [selectedHotelId, hotels, map, setInternalMove]);

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
      const markers: L.Marker[] = [];
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          markers.push(layer);
        }
      });

      if (markers.length === 0) return;

      setInternalMove();
      const group = L.featureGroup(markers);
      map.flyToBounds(group.getBounds(), {
        padding: [50, 50],
        duration: transitionDuration,
        easeLinearity: 0.25,
        maxZoom: 14,
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [hotels, map, transitionDuration, setInternalMove]);

  return null;
}
