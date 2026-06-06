import { describe, it, expect } from "vitest";
import { roomDraftSchema, fullWizardStateSchema } from "../onboarding-schemas";

// ─────────────────────────────────────────────────────────────
// Helper: build a minimal valid fullWizardState for parse tests
// ─────────────────────────────────────────────────────────────
function makeValidState(
	overrides?: Partial<{
		galleryImages: string[];
		roomImageUrls: string[];
	}>,
) {
	return {
		hotelIdentity: {
			name: "Hotel Test",
			city: "Medellín",
			location: "Zona Test",
			propertyType: "hotel" as const,
		},
		galleryImages: overrides?.galleryImages ?? [
			"https://example.com/photo.webp",
		],
		rooms: [
			{
				id: "550e8400-e29b-41d4-a716-446655440000",
				name: "Habitación 1",
				price: 50000,
				imageUrls: overrides?.roomImageUrls ?? [],
			},
		],
		settings: {
			checkInTime: "15:00",
			checkOutTime: "12:00",
			taxRate: 0,
		},
		payment: {
			price: 89900,
			paymentMethod: "wompi" as const,
			planId: null,
			transactionId: null,
			manualReceiptUrl: null,
		},
	};
}

// ─────────────────────────────────────────────────────────────
// roomDraftSchema.imageUrls — unit-level schema tests
// ─────────────────────────────────────────────────────────────
describe("roomDraftSchema.imageUrls", () => {
	const validRoom = {
		id: "550e8400-e29b-41d4-a716-446655440000",
		name: "Suite",
		price: 80000,
	};

	it("rejects a blob: URL", () => {
		const result = roomDraftSchema.safeParse({
			...validRoom,
			imageUrls: ["blob:http://localhost/abc-123"],
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((i) => i.message);
			expect(
				messages.some(
					(m) =>
						m.toLowerCase().includes("blob") ||
						m.toLowerCase().includes("inválida") ||
						m.toLowerCase().includes("invalid"),
				),
			).toBe(true);
		}
	});

	it("rejects a data: URL", () => {
		const result = roomDraftSchema.safeParse({
			...validRoom,
			imageUrls: ["data:image/png;base64,iVBORw0KGgo="],
		});
		expect(result.success).toBe(false);
	});

	it("rejects a javascript: URL", () => {
		const result = roomDraftSchema.safeParse({
			...validRoom,
			imageUrls: ["javascript:alert(1)"],
		});
		expect(result.success).toBe(false);
	});

	it("accepts a valid https:// URL", () => {
		const result = roomDraftSchema.safeParse({
			...validRoom,
			imageUrls: ["https://r2.dev/hotels/photo.webp"],
		});
		expect(result.success).toBe(true);
	});

	it("accepts a valid R2 public URL", () => {
		const result = roomDraftSchema.safeParse({
			...validRoom,
			imageUrls: ["https://pub-abc123.r2.dev/hotel-media/hotels/room.webp"],
		});
		expect(result.success).toBe(true);
	});

	it("rejects mixed valid and invalid URLs", () => {
		const result = roomDraftSchema.safeParse({
			...validRoom,
			imageUrls: ["https://valid.com/img.webp", "blob:invalid"],
		});
		expect(result.success).toBe(false);
	});

	it("accepts empty array (default)", () => {
		const result = roomDraftSchema.safeParse(validRoom);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.imageUrls).toEqual([]);
		}
	});

	it("rejects a blob: URL as the ONLY element", () => {
		const result = roomDraftSchema.safeParse({
			...validRoom,
			imageUrls: ["blob:http://localhost/xyz"],
		});
		expect(result.success).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────
// fullWizardStateSchema.galleryImages — integration-level schema tests
// ─────────────────────────────────────────────────────────────
describe("fullWizardStateSchema.galleryImages", () => {
	it("rejects a blob: URL in galleryImages", () => {
		const state = makeValidState({
			galleryImages: ["blob:http://localhost/abc"],
		});
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
	});

	it("rejects a data: URL in galleryImages", () => {
		const state = makeValidState({
			galleryImages: ["data:image/jpeg;base64,abc"],
		});
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
	});

	it("rejects a javascript: URL in galleryImages", () => {
		const state = makeValidState({ galleryImages: ["javascript:void(0)"] });
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
	});

	it("accepts valid https:// galleryImages", () => {
		const state = makeValidState({
			galleryImages: ["https://cdn.example.com/hotel.webp"],
		});
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(true);
	});

	it("accepts valid R2 public galleryImages", () => {
		const state = makeValidState({
			galleryImages: [
				"https://pub-xyz.r2.dev/hotel-media/hotels/test/card_1.webp",
				"https://pub-xyz.r2.dev/hotel-media/hotels/test/full_2.webp",
			],
		});
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(true);
	});

	it("rejects mixed valid and blob URLs in galleryImages", () => {
		const state = makeValidState({
			galleryImages: ["https://valid.com/a.webp", "blob:invalid"],
		});
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
	});

	it("rejects blob: URL in room imageUrls (cross-field check)", () => {
		const state = makeValidState({
			roomImageUrls: ["blob:http://localhost/room"],
		});
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
	});

	it("accepts valid state with multiple rooms and images", () => {
		const state = {
			hotelIdentity: {
				name: "Hotel Test",
				city: "Bogotá",
				location: "Zona Test",
				propertyType: "hotel" as const,
			},
			galleryImages: [
				"https://cdn.example.com/1.webp",
				"https://cdn.example.com/2.webp",
			],
			rooms: [
				{
					id: "550e8400-e29b-41d4-a716-446655440001",
					name: "Room A",
					price: 60000,
					imageUrls: ["https://cdn.example.com/room-a.webp"],
				},
				{
					id: "550e8400-e29b-41d4-a716-446655440002",
					name: "Room B",
					price: 45000,
					imageUrls: ["https://cdn.example.com/room-b.webp"],
				},
			],
			settings: { checkInTime: "15:00", checkOutTime: "12:00", taxRate: 0.19 },
			payment: {
				price: 89900,
				paymentMethod: "wompi" as const,
				planId: null,
				transactionId: "txn_123",
				manualReceiptUrl: null,
			},
		};
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(true);
	});
});
