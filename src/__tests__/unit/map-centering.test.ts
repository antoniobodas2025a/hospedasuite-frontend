// ============================================================================
// 🧪 Tests Unitarios: Map Centering Resolution Logic
//
// Tests the geocode → flyTo decision logic used by MapTransitionController
// Transition 1. Pure function tests — no React, no DOM, no Leaflet.
// ============================================================================

import { describe, it, expect, vi } from "vitest";

import {
	resolveCenterLocation,
	handleCenterResult,
	GeoResult,
} from "@/lib/map-centering";

// ─── S1: Map centers on searched city after clicking "Mostrar mapa" ──────────

describe("S1: Map centers on searched city (happy path)", () => {
	it('resolves "duitama" to coordinates [5.8245, -73.0323] for flyTo', async () => {
		const mockGeocode = vi.fn().mockResolvedValue({
			lat: 5.8245,
			lng: -73.0323,
			displayName: "Duitama, Boyacá, Colombia",
		} as GeoResult);

		const result = await resolveCenterLocation("duitama", mockGeocode);

		expect(mockGeocode).toHaveBeenCalledWith("duitama");
		expect(result.fly).toBe(true);
		expect(result.target).toEqual({ lat: 5.8245, lng: -73.0323 });
		expect(result.error).toBeNull();
	});

	it('resolves "bogotá" to independent coordinates (not hardcoded)', async () => {
		const mockGeocode = vi.fn().mockResolvedValue({
			lat: 4.6097,
			lng: -74.0817,
			displayName: "Bogotá, Colombia",
		} as GeoResult);

		const result = await resolveCenterLocation("bogotá", mockGeocode);

		expect(mockGeocode).toHaveBeenCalledWith("bogotá");
		expect(result.fly).toBe(true);
		expect(result.target).toEqual({ lat: 4.6097, lng: -74.0817 });
	});
});

// ─── S2: Map shows user feedback when geocoding fails ────────────────────────

describe("S2: User feedback when geocoding fails", () => {
	it("returns fly=false and error message for nonexistent place", async () => {
		const mockGeocode = vi.fn().mockResolvedValue(null);

		const result = await resolveCenterLocation(
			"nonexistent-place",
			mockGeocode,
		);

		expect(mockGeocode).toHaveBeenCalledWith("nonexistent-place");
		expect(result.fly).toBe(false);
		expect(result.target).toBeNull();
		expect(result.error).toBe("No se pudo determinar la ubicación en el mapa");
	});

	it("calls onError callback when geocoding returns null", async () => {
		const mockGeocode = vi.fn().mockResolvedValue(null);
		const onError = vi.fn();

		await handleCenterResult(
			await resolveCenterLocation("nonexistent-place", mockGeocode),
			{ onError },
		);

		expect(onError).toHaveBeenCalledWith(
			"No se pudo determinar la ubicación en el mapa",
		);
	});

	it("does not call onError when geocoding succeeds", async () => {
		const mockGeocode = vi.fn().mockResolvedValue({
			lat: 5.8245,
			lng: -73.0323,
			displayName: "Duitama",
		} as GeoResult);
		const onError = vi.fn();

		await handleCenterResult(
			await resolveCenterLocation("duitama", mockGeocode),
			{ onError },
		);

		expect(onError).not.toHaveBeenCalled();
	});
});
