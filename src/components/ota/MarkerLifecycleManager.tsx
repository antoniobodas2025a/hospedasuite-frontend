"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { geocodeLocation, GeoResult } from "@/lib/geocoding";
import { CLUSTERING_CONFIG } from "@/lib/clustering-config";

interface Hotel {
	id: string;
	name: string;
	location: string;
	address?: string;
	min_price: number;
	slug: string;
	main_image_url?: string;
	/** PRD-009: Coordenadas precomputadas desde ota_catalog */
	latitude?: number | null;
	longitude?: number | null;
	precision?: string | null;
	/** PRD-006: Review stats for popup */
	reviewStats?: { averageRating: number; totalReviews: number };
}

interface MarkerLifecycleManagerProps {
	hotels: Hotel[];
	selectedHotelId?: string;
	onMarkerClick?: (hotelId: string) => void;
	onGeocodingProgress?: (current: number, total: number) => void;
	onMarkersReady?: () => void;
}

// Sprint 3 + PRD-009 Fase 2: Price-badge markers (Airbnb-style)
// Default: price pill showing "$120.000"
// Selected: price pill with brand background, elevated
// Cluster: count badge + cheapest price
function createPricePinIcon(price: number, isSelected: boolean): L.DivIcon {
	const formatted = price > 0 ? `$${price.toLocaleString()}` : "$$$";
	const cls = isSelected ? "marker-price-pill selected" : "marker-price-pill";

	return L.divIcon({
		className: "hotel-marker-wrapper",
		html: `<div class="${cls}">${formatted}</div>`,
		iconSize: isSelected ? [100, 36] : [90, 32],
		iconAnchor: isSelected ? [50, 36] : [45, 32],
		popupAnchor: [0, isSelected ? -36 : -32],
	});
}

// PRD-005 Sprint 3: Mini-dot marker for 2-tier system (Tier 2 = bottom 80%)
function createMiniDotIcon(isSelected: boolean): L.DivIcon {
	const cls = isSelected ? "marker-mini-dot selected" : "marker-mini-dot";

	return L.divIcon({
		className: "hotel-marker-wrapper",
		html: `<div class="${cls}"></div>`,
		iconSize: isSelected ? [18, 18] : [14, 14],
		iconAnchor: isSelected ? [9, 9] : [7, 7],
		popupAnchor: [0, isSelected ? -9 : -7],
	});
}

// PRD-005 Sprint 3: Determine which hotels get price-badge (Tier 1) vs mini-dot (Tier 2).
// Top 20% by rating get price badges; rest get mini-dots.
function computeTier1Ids(hotels: Hotel[]): Set<string> {
	const rated = hotels.filter((h) => (h.reviewStats?.averageRating ?? 0) > 0);
	if (rated.length < 3)
		return new Set(
			hotels.slice(0, Math.ceil(hotels.length * 0.3)).map((h) => h.id),
		);

	const sorted = [...rated].sort(
		(a, b) =>
			(b.reviewStats?.averageRating ?? 0) - (a.reviewStats?.averageRating ?? 0),
	);
	const topCount = Math.max(1, Math.ceil(sorted.length * 0.2));
	return new Set(sorted.slice(0, topCount).map((h) => h.id));
}

/**
 * MarkerLifecycleManager — Manages marker CRUD operations on the map.
 *
 * Handles diffing between current hotels and active markers to avoid
 * unnecessary re-geocoding and re-rendering.
 *
 * Lifecycle:
 * - CREATE: New hotel ID → geocode → add marker to cluster
 * - UPDATE: Existing hotel ID → update popup content (price, etc.)
 * - REMOVE: Hotel ID no longer in list → remove marker from cluster
 * - REUSE: Same hotel ID in new search → reuse existing marker
 */
export default function MarkerLifecycleManager({
	hotels,
	selectedHotelId = "",
	onMarkerClick,
	onGeocodingProgress,
	onMarkersReady,
}: MarkerLifecycleManagerProps) {
	const map = useMap();
	const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
	const markersRef = useRef<Map<string, L.Marker & { geoResult?: GeoResult }>>(
		new Map(),
	);
	const tier1IdsRef = useRef<Set<string>>(new Set());
	const isInitialized = useRef(false);
	const hasFittedBounds = useRef(false);

	// Initialize cluster group
	useEffect(() => {
		if (!map || isInitialized.current) return;

		const clusterGroup = L.markerClusterGroup({
			...CLUSTERING_CONFIG,
			iconCreateFunction: (cluster: L.MarkerCluster) => {
				const count = cluster.getChildCount();
				// Find cheapest price among markers in this cluster
				const markers = cluster.getAllChildMarkers() as (L.Marker & {
					hotelPrice?: number;
				})[];
				const prices = markers
					.map((m) => m.hotelPrice)
					.filter((p): p is number => p != null && p > 0)
					.sort((a, b) => a - b);
				const cheapest =
					prices.length > 0 ? `· $${prices[0].toLocaleString()}` : "";
				const size = count < 5 ? "sm" : count < 15 ? "md" : "lg";

				return L.divIcon({
					html: `<div class="cluster-badge ${size}">${count} ${cheapest}</div>`,
					className: "cluster-wrapper",
					iconSize: L.point(40, 40),
					iconAnchor: L.point(20, 20),
				});
			},
		});

		clusterGroupRef.current = clusterGroup;
		map.addLayer(clusterGroup);
		isInitialized.current = true;

		return () => {
			map.removeLayer(clusterGroup);
		};
	}, [map]);

	// Diffing logic
	useEffect(() => {
		if (!clusterGroupRef.current) return;

		// Reset fitBounds when hotels change to a different set (new search)
		if (hotels.length === 0) {
			hasFittedBounds.current = false;
			return;
		}

		const currentIds = new Set(hotels.map((h) => h.id));
		const activeIds = new Set(markersRef.current.keys());

		// PRD-005 Sprint 3: 2-tier pin ranking — recompute on every hotel set change
		const tier1Ids = computeTier1Ids(hotels);
		tier1IdsRef.current = tier1Ids;

		// 1. REMOVE: Markers that are no longer in the hotel list
		activeIds.forEach((id) => {
			if (!currentIds.has(id)) {
				const marker = markersRef.current.get(id);
				if (marker) {
					clusterGroupRef.current!.removeLayer(marker);
					markersRef.current.delete(id);
				}
			}
		});

		// 2. CREATE / UPDATE: Process current hotels
		let geocodingCount = 0;
		const newHotels = hotels.filter((h) => !activeIds.has(h.id));
		const geocodingPromises: Promise<void>[] = [];

		newHotels.forEach((hotel) => {
			// PRD-009: Use precomputed coordinates from ota_catalog if available
			if (
				hotel.latitude != null &&
				hotel.longitude != null &&
				!isNaN(hotel.latitude) &&
				!isNaN(hotel.longitude)
			) {
				geocodingCount++;
				onGeocodingProgress?.(geocodingCount, newHotels.length);

				if (markersRef.current.has(hotel.id)) return;

				const icon = tier1Ids.has(hotel.id)
					? createPricePinIcon(hotel.min_price, false)
					: createMiniDotIcon(false);

				const marker = L.marker([hotel.latitude, hotel.longitude], {
					icon,
				}) as L.Marker & { geoResult?: GeoResult; hotelPrice?: number };

				marker.geoResult = {
					lat: hotel.latitude,
					lng: hotel.longitude,
					displayName: hotel.location,
				};
				marker.hotelPrice = hotel.min_price;

				// Click marker → scroll to card
				if (onMarkerClick) {
					marker.on("click", () => onMarkerClick(hotel.id));
				}

				// Popup with rating if available
				const ratingHtml = hotel.reviewStats?.averageRating
					? `<span class="popup-rating">★ ${hotel.reviewStats.averageRating.toFixed(1)}</span>`
					: "";
				marker.bindPopup(`
          <div class="hotel-popup">
            ${hotel.main_image_url ? `<img src="${hotel.main_image_url}" alt="${hotel.name}" class="popup-image" onerror="this.style.display='none'" />` : ""}
            <div class="popup-info">
              <h3 class="popup-name">${hotel.name}</h3>
              <div class="popup-meta">
                <span class="popup-location">${hotel.location}</span>
                ${ratingHtml}
              </div>
              <p class="popup-price">
                <span class="price-amount">$${hotel.min_price.toLocaleString()}</span>
                <span class="price-period"> /noche</span>
              </p>
              <a href="/hotel/${hotel.slug}" class="popup-cta">Ver hotel →</a>
            </div>
          </div>
        `);

				clusterGroupRef.current!.addLayer(marker);
				markersRef.current.set(hotel.id, marker);
				return;
			}

			// Fallback: geocode from location/address string (client-side)
			const query = hotel.location || hotel.address || "";
			if (!query) return;

			const promise = geocodeLocation(query).then((result) => {
				if (!result || isNaN(result.lat) || isNaN(result.lng)) return;

				geocodingCount++;
				onGeocodingProgress?.(geocodingCount, newHotels.length);

				// Check if marker was already added by another async call (race condition protection)
				if (markersRef.current.has(hotel.id)) return;

				const icon2 = tier1Ids.has(hotel.id)
					? createPricePinIcon(hotel.min_price, false)
					: createMiniDotIcon(false);

				const marker = L.marker([result.lat, result.lng], {
					icon: icon2,
				}) as L.Marker & { geoResult?: GeoResult; hotelPrice?: number };

				marker.geoResult = result;
				marker.hotelPrice = hotel.min_price;

				// Sprint 2: Click marker → scroll to card
				if (onMarkerClick) {
					marker.on("click", () => onMarkerClick(hotel.id));
				}

				// Add popup with rating if available
				const ratingHtml = hotel.reviewStats?.averageRating
					? `<span class="popup-rating">★ ${hotel.reviewStats.averageRating.toFixed(1)}</span>`
					: "";
				marker.bindPopup(`
          <div class="hotel-popup">
            ${hotel.main_image_url ? `<img src="${hotel.main_image_url}" alt="${hotel.name}" class="popup-image" onerror="this.style.display='none'" />` : ""}
            <div class="popup-info">
              <h3 class="popup-name">${hotel.name}</h3>
              <div class="popup-meta">
                <span class="popup-location">${hotel.location}</span>
                ${ratingHtml}
              </div>
              <p class="popup-price">
                <span class="price-amount">$${hotel.min_price.toLocaleString()}</span>
                <span class="price-period"> /noche</span>
              </p>
              <a href="/hotel/${hotel.slug}" class="popup-cta">Ver hotel →</a>
            </div>
          </div>
        `);

				clusterGroupRef.current!.addLayer(marker);
				markersRef.current.set(hotel.id, marker);
			});

			geocodingPromises.push(promise);
		});

		// Wait for all geocoding to finish before notifying
		Promise.all(geocodingPromises).then(() => {
			onMarkersReady?.();
		});

		// 3. UPDATE: Existing markers (update popup content if price changed)
		hotels.forEach((hotel) => {
			const marker = markersRef.current.get(hotel.id);
			if (marker) {
				// Update popup content without re-geocoding
				marker.setPopupContent(`
          <div class="hotel-popup">
            ${hotel.main_image_url ? `<img src="${hotel.main_image_url}" alt="${hotel.name}" class="popup-image" onerror="this.style.display='none'" />` : ""}
            <div class="popup-info">
              <h3 class="popup-name">${hotel.name}</h3>
              <p class="popup-location">${hotel.location}</p>
              <p class="popup-price">
                <span class="price-amount">$${hotel.min_price.toLocaleString()}</span>
                <span class="price-period"> /noche</span>
              </p>
              <a href="/hotel/${hotel.slug}" class="popup-cta">Ver hotel →</a>
            </div>
          </div>
        `);
				// Update icon if price changed or selection state changed
				marker.setIcon(createPricePinIcon(hotel.min_price, false));
			}
		});

		// Auto-fit bounds only on initial load — prevents zoom loop
		if (markersRef.current.size > 0 && !hasFittedBounds.current) {
			hasFittedBounds.current = true;
			const group = L.featureGroup(Array.from(markersRef.current.values()));
			map.fitBounds(group.getBounds(), { padding: [50, 50] });
		}
	}, [hotels, onGeocodingProgress, map]);

	// Update marker selection state (Idea #2: hover hotel → highlight marker)
	useEffect(() => {
		if (!clusterGroupRef.current) return;

		markersRef.current.forEach((marker, id) => {
			const hotel = hotels.find((h) => h.id === id);
			if (!hotel) return;

			const isSelected = id === selectedHotelId;
			const icon = tier1IdsRef.current.has(id)
				? createPricePinIcon(hotel.min_price, isSelected)
				: createMiniDotIcon(isSelected);
			marker.setIcon(icon);

			// Bring selected marker to front with z-index offset
			marker.setZIndexOffset(isSelected ? 1000 : 0);
		});
	}, [selectedHotelId, hotels]);

	return null;
}
