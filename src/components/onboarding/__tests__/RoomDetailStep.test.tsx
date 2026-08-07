// @vitest-environment jsdom
import "../../../__tests__/bun-test-dom-setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import type { RoomDraft } from "@/store/useOnboardingStore";

// ─── Mock framer-motion ────────────────────────────────────────
vi.mock("framer-motion", () => ({
	motion: {
		div: ({ children }: { children?: React.ReactNode }) =>
			React.createElement("div", {}, children),
		button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
			React.createElement("button", { ...props }, children),
	},
	AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
		React.createElement(React.Fragment, {}, children),
}));

// ─── Mock next-intl ────────────────────────────────────────────
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}));

// ─── Mock child components ─────────────────────────────────────
vi.mock("./AIPolicyAssistant", () => ({
	default: () => <div data-testid="ai-policy-assistant">AI</div>,
}));

vi.mock("./GalleryPicker", () => ({
	default: () => <div data-testid="gallery-picker">GalleryPicker</div>,
}));

vi.mock("@/components/dashboard/PriceCalculator", () => ({
	default: ({ basePrice }: { basePrice: number }) => (
		<div data-testid="price-calculator">PriceCalculator: {basePrice}</div>
	),
}));

// ─── Mock stores ───────────────────────────────────────────────
vi.mock("@/store/useOnboardingStore", () => ({
	useOnboardingStore: () => ({
		setRoomImages: vi.fn(),
		removeRoomImage: vi.fn(),
	}),
}));

vi.mock("@/store/useHotelImagesStore", () => ({
	useHotelImagesStore: () => ({
		categorizedImages: {},
	}),
}));

// Import AFTER mocks
import RoomDetailStep from "../RoomDetailStep";

const baseRoom: RoomDraft = {
	id: "room-1",
	name: "Suite",
	type: "Suite",
	price: 150000,
	description: "",
	amenities: [],
	capacity: 2,
	beds: 1,
	bedType: "queen",
	bathroomType: "privado",
	showerType: "ducha",
	hotWater: true,
	roomView: "exterior",
	imageUrls: [],
	imageFiles: [],
	imageBlurData: [],
	imagePreviews: [],
	availabilityRange: null,
};

describe("RoomDetailStep", () => {
	beforeEach(() => {
		cleanup();
	});

	it("keeps name and price editable for template rooms", () => {
		const onUpdate = vi.fn();
		const room: RoomDraft = { ...baseRoom, fromTemplate: true };
		const { getByDisplayValue } = render(
			<RoomDetailStep room={room} onUpdate={onUpdate} />,
		);

		const nameInput = getByDisplayValue("Suite") as HTMLInputElement;
		const priceInput = getByDisplayValue("150000") as HTMLInputElement;

		expect(nameInput.disabled).toBe(false);
		expect(priceInput.disabled).toBe(false);
	});

	it("locks capacity, beds and bedType for template rooms", () => {
		const onUpdate = vi.fn();
		const room: RoomDraft = { ...baseRoom, fromTemplate: true };
		const { getByDisplayValue, container } = render(
			<RoomDetailStep room={room} onUpdate={onUpdate} />,
		);

		const capacityInput = getByDisplayValue("2") as HTMLInputElement;
		const bedsInput = getByDisplayValue("1") as HTMLInputElement;

		expect(capacityInput.disabled).toBe(true);
		expect(bedsInput.disabled).toBe(true);

		// Bed type buttons should be disabled
		const bedTypeButtons = container.querySelectorAll("button");
		const queenButton = Array.from(bedTypeButtons).find((b) => b.textContent === "Queen");
		expect(queenButton?.disabled).toBe(true);
	});

	it("allows editing all fields for manually created rooms", () => {
		const onUpdate = vi.fn();
		const room: RoomDraft = { ...baseRoom, fromTemplate: false };
		const { getByDisplayValue, container } = render(
			<RoomDetailStep room={room} onUpdate={onUpdate} />,
		);

		const capacityInput = getByDisplayValue("2") as HTMLInputElement;
		const bedsInput = getByDisplayValue("1") as HTMLInputElement;

		expect(capacityInput.disabled).toBe(false);
		expect(bedsInput.disabled).toBe(false);

		const bedTypeButtons = container.querySelectorAll("button");
		const queenButton = Array.from(bedTypeButtons).find((b) => b.textContent === "Queen");
		expect(queenButton?.disabled).toBe(false);
	});

	it("collapses customization section for template rooms", () => {
		const onUpdate = vi.fn();
		const room: RoomDraft = { ...baseRoom, fromTemplate: true };
		const { queryByText } = render(<RoomDetailStep room={room} onUpdate={onUpdate} />);

		// Bathroom customization section is collapsed and labeled as optional
		expect(queryByText(/Personalizar habitación \(opcional\)/i)).toBeDefined();
	});
});
