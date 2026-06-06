// ============================================================================
// 🧪 RED Phase: Provisioning Error Diagnostics
//
// Step 8 (Fase 2 redesign): when provisioning fails, the system
// must detect exactly WHICH required fields are missing and return
// a human-readable guide — not a generic "Error" message.
// ============================================================================

import { describe, it, expect } from "vitest";
import { fullWizardStateSchema } from "@/lib/onboarding-schemas";

// ─── Helper: create a valid base state ──────────────────────────────────────

function makeValidState(overrides?: Record<string, unknown>) {
	return {
		hotelIdentity: {
			name: "Hotel Test",
			city: "Medellín",
			location: "El Poblado",
			propertyType: "hotel" as const,
		},
		galleryImages: [
			"https://example.com/photo.webp",
			"https://example.com/2.webp",
			"https://example.com/3.webp",
		],
		rooms: [
			{
				id: "550e8400-e29b-41d4-a716-446655440000",
				name: "Suite",
				price: 150000,
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
			manualReceiptUrl: null,
		},
		...overrides,
	};
}

// ─── S1: Full valid state passes ────────────────────────────────────────────

describe("Provisioning: valid state", () => {
	it("passes with all required fields complete", () => {
		const state = makeValidState();
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(true);
	});
});

// ─── S2: Missing required fields fail with specific messages ───────────────

describe("Provisioning: missing required fields", () => {
	it("fails when hotel name is empty", () => {
		const state = makeValidState();
		state.hotelIdentity.name = "";
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
		if (!result.success) {
			const msgs = result.error.issues.map((i) => i.path.join("."));
			expect(msgs).toContain("hotelIdentity.name");
		}
	});

	it("fails when city is missing", () => {
		const state = makeValidState();
		state.hotelIdentity.city = "";
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
	});

	it("fails when location (zona/vereda) is missing", () => {
		const state = makeValidState();
		state.hotelIdentity.location = "";
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
	});

	it("fails when check-in time is missing", () => {
		const state = makeValidState();
		delete (state.settings as Record<string, unknown>).checkInTime;
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
	});

	it("fails when check-out time is missing", () => {
		const state = makeValidState();
		delete (state.settings as Record<string, unknown>).checkOutTime;
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
	});

	it("fails when no rooms have price", () => {
		const state = makeValidState();
		state.rooms[0]!.price = 0;
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
	});
});

// ─── S3: Error messages are human-readable (no DB terms) ────────────────────

describe("Provisioning: error messages are domain-language", () => {
	it("does not mention table names or technical terms", () => {
		const state = makeValidState();
		state.hotelIdentity.name = "";
		const result = fullWizardStateSchema.safeParse(state);
		expect(result.success).toBe(false);
		if (!result.success) {
			const allMessages = result.error.issues.map((i) => i.message).join(" ");
			expect(allMessages).not.toMatch(
				/null|undefined|NaN|ota_catalog|hotel_locations/i,
			);
		}
	});
});
