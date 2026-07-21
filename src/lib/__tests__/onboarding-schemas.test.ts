import { describe, it, expect } from "vitest";
import {
	roomDraftSchema,
	fullWizardStateSchema,
	imageCategoryEnum,
	categorizedImageSchema,
	propertyGallerySchema,
} from "../onboarding-schemas";
import { validateNoJargon } from "../jargon-guard";

// ─────────────────────────────────────────────────────────────
// Helper: build a minimal valid fullWizardState for parse tests
// ─────────────────────────────────────────────────────────────
function makeValidState(
	overrides?: Partial<{
		galleryImages: Array<{ url: string; category: string; sort_order: number }>;
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
			{ url: "https://example.com/photo.webp", category: "exterior", sort_order: 0 },
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
			wompi_public_key: "pub_prod_test123",
			wompi_integrity_secret: "integ_prod_test456",
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
			galleryImages: [{ url: "blob:http://localhost/abc", category: "exterior", sort_order: 0 }],
		});
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
	});

	it("rejects a data: URL in galleryImages", () => {
		const state = makeValidState({
			galleryImages: [{ url: "data:image/jpeg;base64,abc", category: "exterior", sort_order: 0 }],
		});
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
	});

	it("rejects a javascript: URL in galleryImages", () => {
		const state = makeValidState({ 
			galleryImages: [{ url: "javascript:void(0)", category: "exterior", sort_order: 0 }] 
		});
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
	});

	it("accepts valid https:// galleryImages", () => {
		const state = makeValidState({
			galleryImages: [
				{ url: "https://cdn.example.com/hotel1.webp", category: "exterior", sort_order: 0 },
				{ url: "https://cdn.example.com/hotel2.webp", category: "lobby", sort_order: 1 },
				{ url: "https://cdn.example.com/hotel3.webp", category: "habitacion", sort_order: 2 },
			],
		});
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(true);
	});

	it("accepts valid R2 public galleryImages", () => {
		const state = makeValidState({
			galleryImages: [
				{ url: "https://pub-xyz.r2.dev/hotel-media/hotels/test/card_1.webp", category: "exterior", sort_order: 0 },
				{ url: "https://pub-xyz.r2.dev/hotel-media/hotels/test/full_2.webp", category: "lobby", sort_order: 1 },
				{ url: "https://pub-xyz.r2.dev/hotel-media/hotels/test/room_3.webp", category: "habitacion", sort_order: 2 },
			],
		});
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(true);
	});

	it("rejects mixed valid and blob URLs in galleryImages", () => {
		const state = makeValidState({
			galleryImages: [
				{ url: "https://valid.com/a.webp", category: "exterior", sort_order: 0 },
				{ url: "blob:invalid", category: "lobby", sort_order: 1 },
			],
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
				{ url: "https://cdn.example.com/1.webp", category: "exterior", sort_order: 0 },
				{ url: "https://cdn.example.com/2.webp", category: "lobby", sort_order: 1 },
				{ url: "https://cdn.example.com/3.webp", category: "habitacion", sort_order: 2 },
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
			settings: { checkInTime: "15:00", checkOutTime: "12:00", taxRate: 0.19, wompi_public_key: "pub_prod_test", wompi_integrity_secret: "integ_prod_test" },
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

// ─────────────────────────────────────────────────────────────
// T1: imageCategoryEnum accepts all 8 valid categories
// ─────────────────────────────────────────────────────────────
describe("T1: imageCategoryEnum — valid categories", () => {
	const validCategories = [
		"exterior",
		"lobby",
		"habitacion",
		"bano",
		"amenidades",
		"restaurante",
		"entorno",
		"otros",
	] as const;

	it.each(validCategories)("accepts '%s' as a valid category", (category) => {
		const result = imageCategoryEnum.safeParse(category);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe(category);
		}
	});

	it("accepts all 8 categories in a single parse", () => {
		const results = validCategories.map((c) => imageCategoryEnum.safeParse(c));
		expect(results.every((r) => r.success)).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────
// T2: imageCategoryEnum rejects invalid/null/empty categories
// ─────────────────────────────────────────────────────────────
describe("T2: imageCategoryEnum — invalid categories", () => {
	it("rejects null with 'Categoría requerida' error", () => {
		const result = imageCategoryEnum.safeParse(null);
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((i) => i.message);
			expect(messages.some((m) => m.includes("Categoría requerida"))).toBe(
				true,
			);
		}
	});

	it("rejects undefined", () => {
		const result = imageCategoryEnum.safeParse(undefined);
		expect(result.success).toBe(false);
	});

	it("rejects empty string", () => {
		const result = imageCategoryEnum.safeParse("");
		expect(result.success).toBe(false);
	});

	it("rejects an unknown category string", () => {
		const result = imageCategoryEnum.safeParse("invalid_category");
		expect(result.success).toBe(false);
	});

	it("rejects a category with wrong casing", () => {
		const result = imageCategoryEnum.safeParse("Exterior");
		expect(result.success).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────
// T3: propertyGallerySchema accepts valid CategorizedImage[]
// ─────────────────────────────────────────────────────────────
describe("T3: propertyGallerySchema — valid CategorizedImage[]", () => {
	const validCategorizedImages = [
		{
			url: "https://cdn.example.com/exterior.webp",
			category: "exterior" as const,
			sort_order: 0,
		},
		{
			url: "https://cdn.example.com/lobby.webp",
			category: "lobby" as const,
			sort_order: 0,
		},
		{
			url: "https://cdn.example.com/room.webp",
			category: "habitacion" as const,
			sort_order: 0,
			blur_data: "data:image/webp;base64,abc123",
		},
	];

	it("accepts a valid array of 3 categorized images", () => {
		const result = propertyGallerySchema.safeParse({
			images: validCategorizedImages,
		});
		expect(result.success).toBe(true);
	});

	it("accepts images with optional fields (alt, blur_data)", () => {
		const result = propertyGallerySchema.safeParse({
			images: [
				{
					url: "https://cdn.example.com/1.webp",
					category: "exterior" as const,
					sort_order: 0,
					alt: "Hotel facade",
					blur_data: null,
				},
				{
					url: "https://cdn.example.com/2.webp",
					category: "lobby" as const,
					sort_order: 1,
				},
				{
					url: "https://cdn.example.com/3.webp",
					category: "bano" as const,
					sort_order: 0,
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it("rejects fewer than 3 images", () => {
		const result = propertyGallerySchema.safeParse({
			images: [
				{
					url: "https://cdn.example.com/1.webp",
					category: "exterior" as const,
					sort_order: 0,
				},
				{
					url: "https://cdn.example.com/2.webp",
					category: "lobby" as const,
					sort_order: 0,
				},
			],
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((i) => i.message);
			expect(
				messages.some((m) => m.includes("al menos 3 fotos")),
			).toBe(true);
		}
	});
});

// ─────────────────────────────────────────────────────────────
// T4: propertyGallerySchema rejects image without category
// (mutation-mindset: removing category must fail)
// ─────────────────────────────────────────────────────────────
describe("T4: propertyGallerySchema — mutation guard (no category)", () => {
	it("rejects an image missing the category field", () => {
		const result = propertyGallerySchema.safeParse({
			images: [
				{ url: "https://cdn.example.com/1.webp", sort_order: 0 },
				{ url: "https://cdn.example.com/2.webp", sort_order: 1 },
				{ url: "https://cdn.example.com/3.webp", sort_order: 2 },
			],
		});
		expect(result.success).toBe(false);
	});

	it("rejects an image with null category", () => {
		const result = propertyGallerySchema.safeParse({
			images: [
				{
					url: "https://cdn.example.com/1.webp",
					category: null,
					sort_order: 0,
				},
				{
					url: "https://cdn.example.com/2.webp",
					category: "lobby" as const,
					sort_order: 1,
				},
				{
					url: "https://cdn.example.com/3.webp",
					category: "bano" as const,
					sort_order: 2,
				},
			],
		});
		expect(result.success).toBe(false);
	});

	it("rejects an image with an invalid category", () => {
		const result = propertyGallerySchema.safeParse({
			images: [
				{
					url: "https://cdn.example.com/1.webp",
					category: "invalid_cat" as const,
					sort_order: 0,
				},
				{
					url: "https://cdn.example.com/2.webp",
					category: "lobby" as const,
					sort_order: 1,
				},
				{
					url: "https://cdn.example.com/3.webp",
					category: "bano" as const,
					sort_order: 2,
				},
			],
		});
		expect(result.success).toBe(false);
	});

	it("rejects an image with a blob: URL", () => {
		const result = propertyGallerySchema.safeParse({
			images: [
				{
					url: "blob:http://localhost/abc",
					category: "exterior" as const,
					sort_order: 0,
				},
				{
					url: "https://cdn.example.com/2.webp",
					category: "lobby" as const,
					sort_order: 1,
				},
				{
					url: "https://cdn.example.com/3.webp",
					category: "bano" as const,
					sort_order: 2,
				},
			],
		});
		expect(result.success).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────
// T12: jargon-guard rejects URLs/strings with forbidden terms
// ─────────────────────────────────────────────────────────────
describe("T12: jargon-guard — forbidden terms", () => {
	it("rejects a string containing 'OTA'", () => {
		const result = validateNoJargon("Canal OTA externo");
		expect(result).not.toBeNull();
		expect(result).toContain("OTA");
	});

	it("rejects a string containing 'Marketplace'", () => {
		const result = validateNoJargon("Listado en Marketplace");
		expect(result).not.toBeNull();
		expect(result).toContain("Marketplace");
	});

	it("rejects a string containing 'marketplace' (lowercase)", () => {
		const result = validateNoJargon("Publicar en marketplace");
		expect(result).not.toBeNull();
	});

	it("rejects a string containing 'vitrina digital'", () => {
		const result = validateNoJargon("Tu vitrina digital en línea");
		expect(result).not.toBeNull();
	});

	it("accepts a clean B2B string", () => {
		const result = validateNoJargon(
			"Galería del hotel con fotos del alojamiento",
		);
		expect(result).toBeNull();
	});

	it("accepts an empty string", () => {
		const result = validateNoJargon("");
		expect(result).toBeNull();
	});
});
