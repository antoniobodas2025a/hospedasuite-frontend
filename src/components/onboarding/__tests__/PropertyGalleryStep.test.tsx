// @vitest-environment jsdom
import "../../../__tests__/bun-test-dom-setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { UI_CATEGORIES, CATEGORY_DISPLAY_ES } from "@/lib/image-category";

// ─── Mock framer-motion ────────────────────────────────────────
vi.mock("framer-motion", () => ({
	motion: {
		div: ({ children }: { children?: React.ReactNode }) =>
			React.createElement("div", {}, children),
		button: ({ children }: { children?: React.ReactNode }) =>
			React.createElement("button", {}, children),
	},
	AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
		React.createElement(React.Fragment, {}, children),
}));

// ─── Mock next-intl ────────────────────────────────────────────
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => "es",
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
const defaultHotelImagesState = {
	categorizedImages: {},
	hasExteriorImage: vi.fn(() => false),
	getTotalImageCount: vi.fn(() => 0),
	addImage: vi.fn(),
	removeImage: vi.fn(),
	reorderImages: vi.fn(),
	setCategory: vi.fn(),
	clearAll: vi.fn(),
};

vi.mock("@/store/useHotelImagesStore", () => ({
	useHotelImagesStore: vi.fn(() => defaultHotelImagesState),
}));

// ─── Mock useOnboardingStore (minimal) ─────────────────────────
const defaultOnboardingState = {
	validationErrors: {},
	galleryPreviews: [],
	setGalleryImages: vi.fn(),
	removeGalleryImage: vi.fn(),
};

vi.mock("@/store/useOnboardingStore", () => ({
	useOnboardingStore: vi.fn(() => defaultOnboardingState),
}));

// Import AFTER mocks
import PropertyGalleryStep from "../PropertyGalleryStep";
import { useHotelImagesStore } from "@/store/useHotelImagesStore";

const mockedUseHotelImagesStore = useHotelImagesStore as unknown as ReturnType<typeof vi.fn>;

// ─── T7: PropertyGalleryStep integration tests ─────────────────
describe("PropertyGalleryStep", () => {
	beforeEach(() => {
		cleanup();
		mockedUseHotelImagesStore.mockReturnValue({
			...defaultHotelImagesState,
			hasExteriorImage: vi.fn(() => false),
			getTotalImageCount: vi.fn(() => 0),
		});
	});

	// ─── Simplified gallery: only exterior required ───────────────

	it("renders the exterior category by default", () => {
		const { getByText } = render(<PropertyGalleryStep />);
		expect(getByText(CATEGORY_DISPLAY_ES["exterior"])).toBeDefined();
	});

	it("does NOT render optional categories by default", () => {
		const { queryByText } = render(<PropertyGalleryStep />);
		const optionalCategories = UI_CATEGORIES.filter((c) => c !== "exterior");
		for (const cat of optionalCategories) {
			expect(queryByText(CATEGORY_DISPLAY_ES[cat])).toBeNull();
		}
	});

	it("renders only one category dropzone container by default", () => {
		const { container } = render(<PropertyGalleryStep />);
		const zones = container.querySelectorAll("[data-testid='category-dropzone']");
		expect(zones.length).toBe(1);
	});

	it("reveals optional categories when expanding the optional section", () => {
		const { getByText, queryByText } = render(<PropertyGalleryStep />);
		const toggle = getByText(/Añadir más fotos \(opcional\)/i);
		fireEvent.click(toggle);

		const optionalCategories = UI_CATEGORIES.filter((c) => c !== "exterior");
		for (const cat of optionalCategories) {
			expect(queryByText(CATEGORY_DISPLAY_ES[cat])).toBeDefined();
		}
	});

	// ─── Validates at least one exterior image ─────────────────

	it("shows validation error when no exterior image is present", () => {
		mockedUseHotelImagesStore.mockReturnValue({
			...defaultHotelImagesState,
			hasExteriorImage: vi.fn(() => false),
		});
		const { getByText } = render(<PropertyGalleryStep />);
		expect(getByText(/exterior/i)).toBeDefined();
	});

	it("does NOT show exterior validation error when exterior image exists", () => {
		mockedUseHotelImagesStore.mockReturnValue({
			...defaultHotelImagesState,
			hasExteriorImage: vi.fn(() => true),
		});
		const { queryByText } = render(<PropertyGalleryStep />);
		const errorElements = queryByText(/al menos una foto de exterior/i);
		expect(errorElements).toBeNull();
	});

	// ─── Shows total image count ───────────────────────────────

	it("displays the total image count from the store", () => {
		mockedUseHotelImagesStore.mockReturnValue({
			...defaultHotelImagesState,
			getTotalImageCount: vi.fn(() => 5),
		});
		const { getByText } = render(<PropertyGalleryStep />);
		expect(getByText(/5 fotos subidas/)).toBeDefined();
	});

	it("shows 0 count when no images are uploaded", () => {
		mockedUseHotelImagesStore.mockReturnValue({
			...defaultHotelImagesState,
			getTotalImageCount: vi.fn(() => 0),
		});
		const { getByText } = render(<PropertyGalleryStep />);
		expect(getByText(/0 fotos subidas/)).toBeDefined();
	});

	// ─── Displays previews from store ─────────────────────────

	it("displays image previews when store has categorized images", () => {
		mockedUseHotelImagesStore.mockReturnValue({
			...defaultHotelImagesState,
			categorizedImages: {
				exterior: [
					{
						file: new File([""], "exterior1.jpg", { type: "image/jpeg" }),
						preview: "blob:exterior1",
						sort_order: 0,
					},
				],
				lobby: [
					{
						file: new File([""], "lobby1.jpg", { type: "image/jpeg" }),
						preview: "blob:lobby1",
						sort_order: 0,
					},
					{
						file: new File([""], "lobby2.jpg", { type: "image/jpeg" }),
						preview: "blob:lobby2",
						sort_order: 1,
					},
				],
			},
			getTotalImageCount: vi.fn(() => 3),
			hasExteriorImage: vi.fn(() => true),
		});

		const { container, getByText } = render(<PropertyGalleryStep />);
		// Exterior shows 1 preview; optional section is collapsed with 2 more
		let previews = container.querySelectorAll("[data-testid='image-preview']");
		expect(previews.length).toBe(1);

		// Expand optional section to reveal the remaining previews
		fireEvent.click(getByText(/Añadir más fotos \(opcional\)/i));
		previews = container.querySelectorAll("[data-testid='image-preview']");
		expect(previews.length).toBe(3);
	});

	it("does not display previews when store is empty", () => {
		mockedUseHotelImagesStore.mockReturnValue({
			...defaultHotelImagesState,
			categorizedImages: {},
			getTotalImageCount: vi.fn(() => 0),
			hasExteriorImage: vi.fn(() => false),
		});

		const { container } = render(<PropertyGalleryStep />);
		const previews = container.querySelectorAll("[data-testid='image-preview']");
		expect(previews.length).toBe(0);
	});
});
