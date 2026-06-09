/**
 * useSorting — Hotel sorting and display logic for OTA Dashboard.
 *
 * Encapsulates sorting by price (asc/desc), rating, and recommended (server ranking).
 * Also manages visible count pagination ("Mostrar más" button).
 *
 * SRP: This hook owns the sorting algorithm and visible slice.
 * OTADashboard should not contain sort logic directly.
 *
 * Ley de Miller: The hook exposes 7±2 properties for maintainability.
 */

import { useMemo, useState, useCallback } from "react";
import { getCachedCoords } from "@/lib/geo-cache";

export type SortOption = "recommended" | "price-asc" | "price-desc" | "rating";

interface UseSortingOptions {
  initialSortBy?: SortOption;
  initialVisibleCount?: number;
  urlLocation?: string;
}

interface UseSortingReturn {
  /** Current sort option */
  sortBy: SortOption;
  /** Setter for sort option */
  setSortBy: (v: SortOption) => void;
  /** Current number of visible hotels (pagination) */
  visibleCount: number;
  /** Increment visible count by step (for "Mostrar más") */
  showMore: (step?: number) => void;
  /** Compute sorted hotels from raw input */
  computeSorted: (
    hotels: any[],
    fallbackHotels: any[],
    isMapMoved: boolean,
    boundsFilterResult: any,
  ) => any[];
  /** Highest-rated hotel (for FeaturedCard) */
  computeFeatured: (sortedHotels: any[]) => any | null;
  /** Calculate distance from city center for a hotel */
  getDistanceFromCenter: (hotel: any) => number | undefined;
}

export function useSorting({
  initialSortBy = "recommended",
  initialVisibleCount = 6,
  urlLocation = "",
}: UseSortingOptions = {}): UseSortingReturn {
  const [sortBy, setSortBy] = useState<SortOption>(initialSortBy);
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);

  const showMore = useCallback((step = 6) => {
    setVisibleCount((prev) => prev + step);
  }, []);

  // Pure sorting computation (no state, just algorithm)
  const computeSorted = useCallback(
    (
      hotels: any[],
      fallbackHotels: any[],
      isMapMoved: boolean,
      boundsFilterResult: any,
    ): any[] => {
      const source = hotels.length > 0 ? hotels : fallbackHotels;

      let filtered = source;
      if (isMapMoved && boundsFilterResult) {
        filtered = source.filter(
          (h: any) =>
            boundsFilterResult.visibleIds.has(h.id) ||
            boundsFilterResult.unresolvableIds.has(h.id),
        );
      }

      const sorted = [...filtered];
      switch (sortBy) {
        case "price-asc":
          return sorted.sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
        case "price-desc":
          return sorted.sort((a, b) => (b.min_price || 0) - (a.min_price || 0));
        case "rating":
          return sorted.sort(
            (a, b) =>
              (b.reviewStats?.averageRating || 0) -
              (a.reviewStats?.averageRating || 0),
          );
        case "recommended":
        default:
          return sorted;
      }
    },
    [sortBy],
  );

  // Featured hotel: highest-rated
  const computeFeatured = useCallback((sortedHotels: any[]): any | null => {
    if (sortedHotels.length === 0) return null;
    return sortedHotels.reduce(
      (best: any, h: any) =>
        (h.reviewStats?.averageRating || 0) >
        (best.reviewStats?.averageRating || 0)
          ? h
          : best,
      sortedHotels[0],
    );
  }, []);

  // Distance from city center (Haversine)
  const cityCenterCoords = useMemo(() => {
    if (!urlLocation) return null;
    return getCachedCoords(urlLocation);
  }, [urlLocation]);

  const getDistanceFromCenter = useCallback(
    (hotel: any): number | undefined => {
      if (!cityCenterCoords) return undefined;
      const hotelCoords = getCachedCoords(hotel.location);
      if (!hotelCoords) return undefined;

      const R = 6371;
      const dLat = ((hotelCoords.lat - cityCenterCoords.lat) * Math.PI) / 180;
      const dLng = ((hotelCoords.lng - cityCenterCoords.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((cityCenterCoords.lat * Math.PI) / 180) *
          Math.cos((hotelCoords.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    [cityCenterCoords],
  );

  return {
    sortBy,
    setSortBy,
    visibleCount,
    showMore,
    computeSorted,
    computeFeatured,
    getDistanceFromCenter,
  };
}
