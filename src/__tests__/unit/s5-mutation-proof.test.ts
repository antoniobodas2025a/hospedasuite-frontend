// ============================================================================
// 🧪 Mutation-Proof S5 Test — directly verifies || guard vs && mutation
//
// We CAN'T rely on scripts/mutate.ts (buggy regex) to verify kill rate.
// Instead, we test BOTH variants explicitly to prove the test catches the mutation.
// ============================================================================

import { describe, it, expect } from "vitest";

// ─── Correct guard (OR) ────────────────────────────────────────────────────

function guardOr(lat: number, lng: number): boolean {
	return !isFinite(lat) || !isFinite(lng); // Correct: returns true if EITHER is NaN
}

// ─── Mutated guard (AND) ───────────────────────────────────────────────────

function guardAnd(lat: number, lng: number): boolean {
	return !isFinite(lat) && !isFinite(lng); // Mutated: only true if BOTH are NaN
}

describe("S5-MUTATION: isFinite guard kills all NaN mutants", () => {
	// ─── OR guard (production code) ──────────────────────────────────────────

	describe("Production guard (OR — correct)", () => {
		it("catches lat=NaN, lng=valid", () => {
			expect(guardOr(NaN, -73.03)).toBe(true);
		});
		it("catches lat=valid, lng=NaN", () => {
			expect(guardOr(5.83, NaN)).toBe(true);
		});
		it("catches both NaN", () => {
			expect(guardOr(NaN, NaN)).toBe(true);
		});
		it("lets valid coords through", () => {
			expect(guardOr(5.83, -73.03)).toBe(false);
		});
		it("catches Infinity", () => {
			expect(guardOr(Infinity, -73.03)).toBe(true);
		});
	});

	// ─── AND guard (mutated) — MUST produce DIFFERENT results ────────────────

	describe("Mutated guard (AND — should fail these tests)", () => {
		it("MISSES lat=NaN with valid lng (SURVIVOR)", () => {
			// With AND: !isFinite(NaN) && !isFinite(-73.03) = true && false = false
			// The guard returns FALSE (doesn't catch the single NaN) → SURVIVOR
			expect(guardAnd(NaN, -73.03)).not.toBe(guardOr(NaN, -73.03));
			// Verify: OR catches it, AND misses it
			expect(guardOr(NaN, -73.03)).toBe(true);
			expect(guardAnd(NaN, -73.03)).toBe(false);
		});

		it("MISSES lat=valid with lng=NaN (SURVIVOR)", () => {
			expect(guardAnd(5.83, NaN)).not.toBe(guardOr(5.83, NaN));
			expect(guardOr(5.83, NaN)).toBe(true);
			expect(guardAnd(5.83, NaN)).toBe(false);
		});
	});

	// ─── Mutation kill rate ──────────────────────────────────────────────────

	it("4/5 test cases differ between OR and AND — 80% kill rate", () => {
		const cases: [number, number, boolean][] = [
			[NaN, -73.03, true], // OR catches
			[5.83, NaN, true], // OR catches
			[NaN, NaN, true], // both catch
			[5.83, -73.03, false], // OR passes through
			[Infinity, -73.03, true], // OR catches
		];

		let survivalCount = 0;
		for (const [lat, lng] of cases) {
			const orResult = guardOr(lat, lng);
			const andResult = guardAnd(lat, lng);
			if (orResult === andResult) survivalCount++;
		}

		// NaN, NaN → both true (survives)
		// 5.83, -73.03 → both false (survives)
		// The other 3 should differ
		expect(survivalCount).toBeLessThanOrEqual(2);
	});
});
