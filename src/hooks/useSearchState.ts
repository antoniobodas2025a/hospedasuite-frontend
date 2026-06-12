/**
 * useSearchState — Search state management for Channel Dashboard.
 *
 * Encapsulates all search-related state: term, step (progressive disclosure),
 * category, and the commit action that transitions from location-only to full search.
 *
 * SRP: This hook owns the search UI state. ChannelDashboard should not manage
 * searchTerm, searchStep, or category directly.
 *
 * Ley de Miller: The hook exposes 7±2 properties for maintainability.
 */

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { RELEVANT_PARAMS } from "@/lib/handoff-url";

interface UseSearchStateOptions {
  initialCategory?: string;
  initialLocation?: string;
}

interface UseSearchStateReturn {
  /** Current search term (location text) */
  searchTerm: string;
  /** Setter for search term */
  setSearchTerm: (v: string) => void;
  /** Current search step: 'location' (progressive disclosure step 1) or 'full' */
  searchStep: "location" | "full";
  /** Setter for search step */
  setSearchStep: (v: "location" | "full") => void;
  /** Active category filter */
  activeCategory: string;
  /** Setter for active category */
  setActiveCategory: (v: string) => void;
  /** Category dropdown open state */
  isCategoryOpen: boolean;
  /** Setter for category dropdown */
  setIsCategoryOpen: (v: boolean) => void;
  /** Commit location and transition to full search bar */
  handleCommitLocation: () => void;
  /** Sync current state to URL */
  syncToUrl: (updates: { category?: string; search?: string; location?: string }) => void;
  /** URL-derived values */
  urlValues: {
    category: string;
    location: string;
    checkin: string;
    checkout: string;
    guests: number | undefined;
  };
}

export function useSearchState({
  initialCategory = "all",
  initialLocation = "",
}: UseSearchStateOptions = {}): UseSearchStateReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL-derived values
  const urlCategory = searchParams.get("category") || initialCategory;
  const urlLocation = searchParams.get("location") || initialLocation;
  const urlCheckin = searchParams.get("checkin") || "";
  const urlCheckout = searchParams.get("checkout") || "";
  const urlGuests = searchParams.get("guests")
    ? Number(searchParams.get("guests"))
    : undefined;

  // Search state
  const [searchTerm, setSearchTerm] = useState(urlLocation);
  const [searchStep, setSearchStep] = useState<"location" | "full">("location");
  const [activeCategory, setActiveCategory] = useState(urlCategory);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Sync state to URL (preserves all relevant params)
  const syncToUrl = useCallback(
    (updates: { category?: string; search?: string; location?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.category !== undefined) {
        if (updates.category === "all") params.delete("category");
        else params.set("category", updates.category);
      }
      if (updates.search !== undefined) {
        if (updates.search === "") params.delete("search");
        else params.set("search", updates.search);
      }
      if (updates.location !== undefined) {
        if (updates.location === "") params.delete("location");
        else params.set("location", updates.location);
      }
      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      router.replace(url, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  // Commit location → transition to full search bar
  const handleCommitLocation = useCallback(() => {
    if (!searchTerm.trim()) return;
    syncToUrl({ location: searchTerm });
    setSearchStep("full");
  }, [searchTerm, syncToUrl]);

  return {
    searchTerm,
    setSearchTerm,
    searchStep,
    setSearchStep,
    activeCategory,
    setActiveCategory,
    isCategoryOpen,
    setIsCategoryOpen,
    handleCommitLocation,
    syncToUrl,
    urlValues: {
      category: urlCategory,
      location: urlLocation,
      checkin: urlCheckin,
      checkout: urlCheckout,
      guests: urlGuests,
    },
  };
}
