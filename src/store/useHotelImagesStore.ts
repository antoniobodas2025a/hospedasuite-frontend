import { create } from "zustand";
import type { ImageCategory } from "@/types";

/**
 * Image entry in the categorized images store.
 * Holds the File object (for upload) and a preview URL (blob:).
 */
export interface CategorizedImageEntry {
	file: File;
	preview: string;
	sort_order: number;
}

export interface HotelImagesState {
	/** Images grouped by category */
	categorizedImages: Record<string, CategorizedImageEntry[]>;

	/** Add a file to a specific category */
	addImage: (category: ImageCategory, file: File, preview: string) => void;

	/** Remove an image by category and index */
	removeImage: (category: ImageCategory, index: number) => void;

	/** Reorder images within a category (move from one index to another) */
	reorderImages: (
		category: ImageCategory,
		fromIndex: number,
		toIndex: number,
	) => void;

	/** Move an image from one category to another */
	setCategory: (
		fromCategory: ImageCategory,
		index: number,
		toCategory: ImageCategory,
	) => void;

	/** Get total image count across all categories */
	getTotalImageCount: () => number;

	/** Check if at least one exterior image exists */
	hasExteriorImage: () => boolean;

	/** Clear all categorized images */
	clearAll: () => void;
}

export const useHotelImagesStore = create<HotelImagesState>((set, get) => ({
	categorizedImages: {},

	addImage: (category, file, preview) =>
		set((state) => {
			const existing = state.categorizedImages[category] ?? [];
			return {
				categorizedImages: {
					...state.categorizedImages,
					[category]: [
						...existing,
						{ file, preview, sort_order: existing.length },
					],
				},
			};
		}),

	removeImage: (category, index) =>
		set((state) => {
			const existing = state.categorizedImages[category];
			if (!existing || index < 0 || index >= existing.length) return state;

			const updated = existing.filter((_, i) => i !== index);
			const recomputed = updated.map((entry, i) => ({
				...entry,
				sort_order: i,
			}));

			return {
				categorizedImages: {
					...state.categorizedImages,
					[category]: recomputed,
				},
			};
		}),

	reorderImages: (category, fromIndex, toIndex) =>
		set((state) => {
			const existing = state.categorizedImages[category];
			if (!existing) return state;
			if (
				fromIndex < 0 ||
				fromIndex >= existing.length ||
				toIndex < 0 ||
				toIndex >= existing.length
			)
				return state;

			const updated = [...existing];
			const [moved] = updated.splice(fromIndex, 1);
			updated.splice(toIndex, 0, moved);
			const recomputed = updated.map((entry, i) => ({
				...entry,
				sort_order: i,
			}));

			return {
				categorizedImages: {
					...state.categorizedImages,
					[category]: recomputed,
				},
			};
		}),

	setCategory: (fromCategory, index, toCategory) =>
		set((state) => {
			const source = state.categorizedImages[fromCategory];
			if (!source || index < 0 || index >= source.length) return state;

			const image = source[index];
			const newSource = source.filter((_, i) => i !== index);
			const recomputedSource = newSource.map((entry, i) => ({
				...entry,
				sort_order: i,
			}));

			const target = state.categorizedImages[toCategory] ?? [];
			const newTarget = [
				...target,
				{ ...image, sort_order: target.length },
			];

			const updatedCategories = {
				...state.categorizedImages,
				[fromCategory]: recomputedSource,
				[toCategory]: newTarget,
			};

			// Clean up empty source category
			if (recomputedSource.length === 0) {
				delete updatedCategories[fromCategory];
			}

			return { categorizedImages: updatedCategories };
		}),

	getTotalImageCount: () => {
		const { categorizedImages } = get();
		return Object.values(categorizedImages).reduce(
			(sum, images) => sum + images.length,
			0,
		);
	},

	hasExteriorImage: () => {
		const { categorizedImages } = get();
		return (categorizedImages["exterior"]?.length ?? 0) > 0;
	},

	clearAll: () => set({ categorizedImages: {} }),
}));
