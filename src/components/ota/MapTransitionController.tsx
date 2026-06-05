"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { geocodeLocation } from "@/lib/geocoding";
import { resolveCenterLocation, handleCenterResult } from "@/lib/map-centering";
import { useUserDraggingGuard } from "@/lib/use-user-dragging-guard";
import { useSharedMoveGuard } from "@/lib/use-shared-move-guard";

interface Hotel {
	id: string;
	location: string;
	address?: string;
	/** PRD-009: Coordenadas precomputadas (evitan geocoding client-side) */
	latitude?: number | null;
	longitude?: number | null;
}

interface MapTransitionControllerProps {
	hotels: Hotel[];
	centerLocation?: string;
	selectedHotelId?: string;
	transitionDuration?: number;
	/** S2: Callback when geocoding fails — parent shows user-facing message */
	onCenterError?: (message: string) => void;
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
	selectedHotelId = "",
	transitionDuration = 1.2,
	onCenterError,
}: MapTransitionControllerProps) {
	const map = useMap();
	const { setInternalMove } = useSharedMoveGuard();
	const { isDragging } = useUserDraggingGuard();
	const lastHotelIdsRef = useRef<Set<string>>(new Set());
	const isInitialMount = useRef(true);
	const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);

	// Transition 1: flyTo when centerLocation changes
	useEffect(() => {
		if (!centerLocation) return;

		let cancelled = false;

		const flyToLocation = async () => {
			const decision = await resolveCenterLocation(
				centerLocation,
				geocodeLocation,
			);

			// S2: Handle geocoding failure — notify parent for user feedback
			handleCenterResult(decision, { onError: onCenterError });

			if (cancelled || !decision.fly || !decision.target) return;

			// S5: capture and validate inline — impossible to bypass
			const tLat = decision.target.lat;
			const tLng = decision.target.lng;
		if (!isFinite(tLat) || !isFinite(tLng)) return;

		// S14: Abort if user is actively dragging/zooming
		if (isDragging.current) return;

		// Micro-movement filter: skip if change < 0.001° (~111m)
		const mapCenter = map.getCenter();
		const dist = Math.sqrt(
			Math.pow(tLat - mapCenter.lat, 2) + Math.pow(tLng - mapCenter.lng, 2)
		);
		if (lastCenterRef.current && dist < 0.001) return;
		lastCenterRef.current = { lat: tLat, lng: tLng };

			setInternalMove();
			map.flyTo([tLat, tLng], 12, {
				duration: transitionDuration,
				easeLinearity: 0.25,
			});
		};

		flyToLocation();

		return () => {
			cancelled = true;
		};
	}, [centerLocation, map, transitionDuration, setInternalMove, onCenterError]);

	// Transition 3: flyTo selected hotel marker (Idea #2: hover hotel → zoom to marker)
	useEffect(() => {
		if (!selectedHotelId) return;

		const hotel = hotels.find((h) => h.id === selectedHotelId);
		if (!hotel) return;

		let cancelled = false;

		const flyToHotel = async () => {
			// PRD-009: Usar coordenadas precomputadas si existen
			if (
				hotel.latitude != null &&
				hotel.longitude != null &&
				!isNaN(hotel.latitude) &&
				!isNaN(hotel.longitude)
			) {
				setInternalMove();
				map.flyTo([hotel.latitude, hotel.longitude], 14, {
					duration: 0.8,
					easeLinearity: 0.25,
				});
				return;
			}

			// Fallback: geocoding client-side
			const query = hotel.location || hotel.address || "";
			if (!query) return;

			const result = await geocodeLocation(query);
			if (cancelled || !result) return;

			// S5: capture and validate inline — impossible to bypass
			const rLat = result.lat;
			const rLng = result.lng;
		if (!isFinite(rLat) || !isFinite(rLng)) return;

		// S14: Abort if user is actively dragging/zooming
		if (isDragging.current) return;

		// Micro-movement filter
		const mapCenter = map.getCenter();
		const dist = Math.sqrt(
			Math.pow(rLat - mapCenter.lat, 2) + Math.pow(rLng - mapCenter.lng, 2)
		);
		if (dist < 0.001) return;

			setInternalMove();
			map.flyTo([rLat, rLng], 14, {
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
