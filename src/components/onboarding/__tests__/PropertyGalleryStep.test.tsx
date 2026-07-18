// @vitest-environment jsdom
import "../../../__tests__/bun-test-dom-setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { IMAGE_CATEGORIES, CATEGORY_DISPLAY_ES } from "@/lib/image-category";

// ─── Mock framer-motion ────────────────────────────────────────
vi.mock("framer-motion", () => ({
	motion: {
		div: ({ children }: { children?: React.ReactNode }) =>
			React.createElement("div", {}, children),
		button: ({ children }: { children?: React.ReactNode }) =>
			React.createElement("button", {}, children),
	},
}));

// ─── Mock next-intl ────────────────────────────────────────────
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}));

// ─── Mock react-dropzone (used by CategorizedDropzone) ─────────
vi.mock("react-dropzone", () => ({
	useDropzone: () => ({
		getRootProps: () => ({
			ref: vi.fn(),
			onClick: vi.fn(),
			onDragEnter: vi.fn(),
			onDragOver: vi.fn(),
			onDragLeave: vi.fn(),
			onDrop: vi.fn(),
			role: "presentation" as const,
		}),
		getInputProps: () => ({
			ref: vi.fn(),
			type: "file" as const,
			accept: "image/jpeg,image/png,image/webp",
			multiple: true,
			onChange: vi.fn(),
			style: { display: "none" },
		}),
		open: vi.fn(),
		acceptedFiles: [],
		rejectedFiles: [],
		isDragActive: false,
		rootRef: vi.fn(),
		inputRef: vi.fn(),
	}),
}));

// ─── Mock useHotelImagesStore ──────────────────────────────────
const mockHasExteriorImage = vi.fn(() => false);
const mockGetTotalImageCount = vi.fn(() => 0);

const storeState = {
	categorizedImages: {},
	hasExteriorImage: mockHasExteriorImage,
	getTotalImageCount: mockGetTotalImageCount,
	addImage: vi.fn(),
	removeImage: vi.fn(),
	reorderImages: vi.fn(),
	setCategory: vi.fn(),
	clearAll: vi.fn(),
};

const mockUseHotelImagesStore = vi.fn(() => storeState) as unknown as {
	(): typeof storeState;
	getState: () => typeof storeState;
};
mockUseHotelImagesStore.getState = () => storeState;

vi.mock("@/store/useHotelImagesStore", () => ({
	useHotelImagesStore: mockUseHotelImagesStore,
}));

// ─── Mock useOnboardingStore (minimal) ─────────────────────────
const onboardingState = {
	validationErrors: {},
	galleryPreviews: [],
	setGalleryImages: vi.fn(),
	removeGalleryImage: vi.fn(),
};

const mockUseOnboardingStore = vi.fn(() => onboardingState) as unknown as {
	(): typeof onboardingState;
	getState: () => typeof onboardingState;
};
mockUseOnboardingStore.getState = () => onboardingState;

vi.mock("@/store/useOnboardingStore", () => ({
	useOnboardingStore: mockUseOnboardingStore,
}));

// Import AFTER mocks
import PropertyGalleryStep from "../PropertyGalleryStep";

// ─── T7: PropertyGalleryStep integration tests ─────────────────
describe("PropertyGalleryStep", () => {
	beforeEach(() => {
		cleanup();
		mockHasExteriorImage.mockReturnValue(false);
		mockGetTotalImageCount.mockReturnValue(0);
	});

	// ─── Renders 8 categorized dropzones ───────────────────────

	it("renders all 8 category labels", () => {
		const { getByText } = render(<PropertyGalleryStep />);
		for (const cat of IMAGE_CATEGORIES) {
			expect(getByText(CATEGORY_DISPLAY_ES[cat])).toBeDefined();
		}
	});

	it("renders 8 category dropzone containers", () => {
		const { container } = render(<PropertyGalleryStep />);
		const zones = container.querySelectorAll("[data-testid='category-dropzone']");
		expect(zones.length).toBe(8);
	});

	// ─── Validates at least one exterior image ─────────────────

	it("shows validation error when no exterior image is present", () => {
		mockHasExteriorImage.mockReturnValue(false);
		const { getByText } = render(<PropertyGalleryStep />);
		expect(getByText(/exterior/i)).toBeDefined();
	});

	it("does NOT show exterior validation error when exterior image exists", () => {
		mockHasExteriorImage.mockReturnValue(true);
		const { queryByText } = render(<PropertyGalleryStep />);
		// The validation error about missing exterior should not appear
		const errorElements = queryByText(/al menos una foto de exterior/i);
		expect(errorElements).toBeNull();
	});

	// ─── Shows total image count ───────────────────────────────

	it("displays the total image count from the store", () => {
		mockGetTotalImageCount.mockReturnValue(5);
		const { getByText } = render(<PropertyGalleryStep />);
		expect(getByText(/5/)).toBeDefined();
	});

	it("shows 0 count when no images are uploaded", () => {
		mockGetTotalImageCount.mockReturnValue(0);
		const { getByText } = render(<PropertyGalleryStep />);
		expect(getByText(/0/)).toBeDefined();
	});
});
