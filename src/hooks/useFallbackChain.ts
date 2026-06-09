/**
 * useFallbackChain — 5-level search relaxation cascade for OTA.
 *
 * When primary search returns zero results, this hook progressively relaxes
 * filters to find alternatives:
 *   Level 1: Fuzzy typo detection on location
 *   Level 2: Remove category filter
 *   Level 3: Remove location filter
 *   Level 4: All filters off + popular suggestions
 *   Level 5: Pure suggestions (no results at all)
 *
 * SRP: This hook owns the fallback cascade logic. OTADashboard should not
 * contain fallback state or cascade effects directly.
 *
 * Heurística #9 (Nielsen): Recovery from errors — user never sees a dead end.
 * Ley de Miller: 5 levels (within 7±2 chunk limit).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { fuzzySearch } from "@/lib/fuzzy-search";
import { fetchOTAHotelsAction } from "@/app/actions/ota";
import type { SearchSuggestion } from "@/components/ota/SearchSuggestions";

// ── Fallback cities for typo detection ──────────────────────────────────────
const FALLBACK_CITIES = [
  "Bogotá", "Medellín", "Cartagena", "Cali", "Barranquilla",
  "Santa Marta", "San Andrés", "Pereira", "Manizales", "Armenia",
  "Bucaramanga", "Villavicencio", "Cúcuta", "Ibagué", "Neiva",
  "Popayán", "Pasto", "Montería", "Sincelejo", "Valledupar",
  "Guatapé", "Jardín", "Salento", "Filandia", "Villa de Leyva",
  "Barichara", "Palomino", "Minca", "Capurganá", "Nuquí",
];

const POPULAR_DESTINATIONS = [
  { city: "Medellín", hotelCount: 45 },
  { city: "Cartagena", hotelCount: 38 },
  { city: "Bogotá", hotelCount: 32 },
  { city: "Santa Marta", hotelCount: 28 },
  { city: "San Andrés", hotelCount: 22 },
  { city: "Eje Cafetero", hotelCount: 20 },
  { city: "Guatapé", hotelCount: 15 },
  { city: "Villa de Leyva", hotelCount: 12 },
];

interface UseFallbackChainOptions {
  /** Whether a primary search is in progress */
  isSearching: boolean;
  /** Primary search results count */
  hotelsLength: number;
  /** Current active category */
  activeCategory: string;
  /** Current location filter */
  urlLocation: string;
  /** Current search term */
  searchTerm: string;
  /** Date/guest params */
  urlCheckin: string;
  urlCheckout: string;
  urlGuests: number | undefined;
}

interface UseFallbackChainReturn {
  /** Current fallback level (0=normal, 1-5=cascade) */
  fallbackLevel: number;
  /** User-facing message for current fallback state */
  fallbackMessage: string;
  /** Suggestions to display (typo corrections, alternatives) */
  suggestions: SearchSuggestion[];
  /** Hotels from fallback searches */
  fallbackHotels: any[];
  /** Whether a fallback search is in-flight */
  isFallbackSearching: boolean;
  /** Reset fallback state (called when user manually changes search) */
  resetFallback: () => void;
  /** Handle suggestion click */
  handleSuggestionClick: (suggestion: SearchSuggestion, onApply: (location: string, category: string) => void) => void;
  /** Handle "Buscar en toda Colombia" */
  handleSearchAllColombia: (onApply: (location: string, category: string) => void) => void;
}

export function useFallbackChain({
  isSearching,
  hotelsLength,
  activeCategory,
  urlLocation,
  searchTerm,
  urlCheckin,
  urlCheckout,
  urlGuests,
}: UseFallbackChainOptions): UseFallbackChainReturn {
  const [fallbackLevel, setFallbackLevel] = useState(0);
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [fallbackHotels, setFallbackHotels] = useState<any[]>([]);
  const [isFallbackSearching, setIsFallbackSearching] = useState(false);
  const fallbackTriggeredRef = useRef(false);
  const [_fallbackResultCount, setFallbackResultCount] = useState(0);

  // Reset fallback when user manually changes search
  useEffect(() => {
    if (!fallbackTriggeredRef.current) {
      setFallbackLevel(0);
      setFallbackMessage("");
      setFallbackHotels([]);
      setSuggestions([]);
      setFallbackResultCount(0);
    }
    fallbackTriggeredRef.current = false;
  }, [searchTerm, activeCategory, urlLocation, urlCheckin, urlCheckout, urlGuests]);

  // Fallback cascade effect
  useEffect(() => {
    if (isSearching || isFallbackSearching) return;
    if (hotelsLength > 0 || fallbackHotels.length > 0 || fallbackLevel >= 5)
      return;

    const hasCategory = activeCategory !== "all";
    const hasLocation = !!urlLocation;
    if (fallbackLevel >= 2 && !hasCategory && !hasLocation) return;

    const runFallback = async () => {
      const nextLevel = fallbackLevel + 1;
      fallbackTriggeredRef.current = true;
      setIsFallbackSearching(true);

      let message = "";
      let newSuggestions: SearchSuggestion[] = [];
      let newHotels: any[] = [];
      let resultCount = 0;

      switch (nextLevel) {
        case 1: {
          if (!urlLocation) break;
          const citiesList = FALLBACK_CITIES.map((c) => ({ city: c }));
          const matches = fuzzySearch(citiesList, urlLocation, ["city", "location"], 5);
          const goodMatches = matches.filter((m) => m.score < 0.3);
          if (goodMatches.length > 0) {
            const best = goodMatches[0].item.city;
            newSuggestions = [{ text: best, subtitle: `Corrección de "${urlLocation}"`, action: best, icon: "city" }];
            message = `¿Querías decir "${best}"?`;
          }
          break;
        }
        case 2: {
          if (activeCategory === "all") break;
          const response = await fetchOTAHotelsAction(0, 24, "all", searchTerm, urlLocation, urlCheckin, urlCheckout, urlGuests);
          if (response.success && response.data.length > 0) {
            newHotels = response.data;
            resultCount = response.data.length;
            message = `Mostrando ${resultCount} resultados de todas las categorías`;
          }
          break;
        }
        case 3: {
          if (!urlLocation) break;
          const response = await fetchOTAHotelsAction(0, 24, activeCategory, searchTerm, "", urlCheckin, urlCheckout, urlGuests);
          if (response.success && response.data.length > 0) {
            newHotels = response.data;
            resultCount = response.data.length;
            message = `Mostrando ${resultCount} resultados en otras zonas`;
          }
          break;
        }
        case 4: {
          const response = await fetchOTAHotelsAction(0, 24, "all", searchTerm, "", urlCheckin, urlCheckout, urlGuests);
          if (response.success && response.data.length > 0) {
            newHotels = response.data;
            resultCount = response.data.length;
            message = `Resultados en toda Colombia • ${resultCount} alojamientos`;
          }
          newSuggestions = POPULAR_DESTINATIONS.map((d) => ({
            text: d.city, subtitle: `${d.hotelCount} alojamientos`, action: d.city, icon: "city" as const,
          }));
          break;
        }
        case 5: {
          newSuggestions = POPULAR_DESTINATIONS.map((d) => ({
            text: d.city, subtitle: `${d.hotelCount} alojamientos`, action: d.city, icon: "city" as const,
          }));
          message = "No encontramos resultados. Explorá estas alternativas:";
          break;
        }
      }

      setFallbackLevel(nextLevel);
      setFallbackMessage(message);
      setSuggestions(newSuggestions);
      setFallbackHotels(newHotels);
      setFallbackResultCount(resultCount);
      setIsFallbackSearching(false);
    };

    runFallback();
  }, [hotelsLength, fallbackHotels.length, fallbackLevel, isSearching, activeCategory, urlLocation, searchTerm, urlCheckin, urlCheckout, urlGuests]);

  const resetFallback = useCallback(() => {
    setFallbackLevel(0);
    setFallbackMessage("");
    setFallbackHotels([]);
    setSuggestions([]);
    setFallbackResultCount(0);
  }, []);

  const handleSuggestionClick = useCallback(
    (suggestion: SearchSuggestion, onApply: (location: string, category: string) => void) => {
      resetFallback();
      onApply(suggestion.action, "all");
    },
    [resetFallback],
  );

  const handleSearchAllColombia = useCallback(
    (onApply: (location: string, category: string) => void) => {
      resetFallback();
      onApply("", "all");
    },
    [resetFallback],
  );

  return {
    fallbackLevel,
    fallbackMessage,
    suggestions,
    fallbackHotels,
    isFallbackSearching,
    resetFallback,
    handleSuggestionClick,
    handleSearchAllColombia,
  };
}
