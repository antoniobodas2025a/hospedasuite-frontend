// @vitest-environment jsdom
import "../bun-test-dom-setup";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { useHotelImagesStore } from "@/store/useHotelImagesStore";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import PropertyGalleryStep from "@/components/onboarding/PropertyGalleryStep";

// Mock framer-motion
vi.mock("framer-motion", () => ({
	motion: {
		div: ({ children }: { children?: React.ReactNode }) =>
			React.createElement("div", {}, children),
		button: ({ children }: { children?: React.ReactNode }) =>
			React.createElement("button", {}, children),
	},
}));

// Mock next-intl
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}));

// Mock react-dropzone
vi.mock("react-dropzone", () => ({
	useDropzone: () => ({
		getRootProps: () => ({}),
		getInputProps: () => ({}),
		isDragActive: false,
	}),
}));

describe("Gallery data pipeline bridge", () => {
	beforeEach(() => {
		// Reset stores completely
		useHotelImagesStore.setState({
			categorizedImages: {},
		});
		useOnboardingStore.setState({
			galleryFiles: [],
			galleryPreviews: [],
		});
	});

	afterEach(() => {
		cleanup();
	});

	it("bridges useHotelImagesStore to useOnboardingStore.galleryFiles", () => {
		// Arrange: User uploads images in Step 2 (PropertyGalleryStep)
		const hotelImagesStore = useHotelImagesStore.getState();
		const exteriorFile = new File(["test"], "exterior.jpg", { type: "image/jpeg" });
		const lobbyFile = new File(["test"], "lobby.jpg", { type: "image/jpeg" });

		hotelImagesStore.addImage("exterior", exteriorFile, "blob:exterior");
		hotelImagesStore.addImage("lobby", lobbyFile, "blob:lobby");

		// Act: Render PropertyGalleryStep (triggers useEffect bridge)
		render(<PropertyGalleryStep />);

		// Assert: Provisioning can find the files in onboarding store
		const provisioningState = useOnboardingStore.getState();
		expect(provisioningState.galleryFiles.length).toBe(2);
		expect(provisioningState.galleryPreviews.length).toBe(2);
		expect(provisioningState.galleryFiles[0].name).toBe("exterior.jpg");
		expect(provisioningState.galleryFiles[1].name).toBe("lobby.jpg");
	});

	it("preserves category metadata when bridging", () => {
		// Arrange: Upload images with different categories
		const hotelImagesStore = useHotelImagesStore.getState();
		const exteriorFile = new File(["test"], "exterior.jpg", { type: "image/jpeg" });
		const lobbyFile = new File(["test"], "lobby.jpg", { type: "image/jpeg" });

		hotelImagesStore.addImage("exterior", exteriorFile, "blob:exterior");
		hotelImagesStore.addImage("lobby", lobbyFile, "blob:lobby");

		// Act: Render PropertyGalleryStep (triggers useEffect bridge)
		render(<PropertyGalleryStep />);

		// Assert: Category metadata is preserved in hotelImagesStore
		const currentStoreState = useHotelImagesStore.getState();
		const categorizedImages = Object.entries(currentStoreState.categorizedImages).flatMap(
			([category, entries]) =>
				entries.map((entry, index) => ({
					url: entry.preview,
					category: category,
					sort_order: index,
				})),
		);

		expect(categorizedImages.length).toBe(2);
		expect(categorizedImages[0]).toEqual({
			url: "blob:exterior",
			category: "exterior",
			sort_order: 0,
		});
		expect(categorizedImages[1]).toEqual({
			url: "blob:lobby",
			category: "lobby",
			sort_order: 0,
		});
	});

	it("handles empty gallery gracefully", () => {
		// Arrange: No images uploaded
		const hotelImagesStore = useHotelImagesStore.getState();
		expect(hotelImagesStore.getTotalImageCount()).toBe(0);

		// Act: Render PropertyGalleryStep (triggers useEffect bridge)
		render(<PropertyGalleryStep />);

		// Assert: Empty arrays, no errors
		const provisioningState = useOnboardingStore.getState();
		expect(provisioningState.galleryFiles.length).toBe(0);
		expect(provisioningState.galleryPreviews.length).toBe(0);
	});
});
