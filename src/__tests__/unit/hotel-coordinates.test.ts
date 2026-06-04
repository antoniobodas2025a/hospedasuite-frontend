// ============================================================================
// 🧪 Tests Unitarios: Hotel Coordinate Resolution
//
// Tests the two-tier coordinate lookup: ota_catalog (primary) →
// hotel_locations (fallback). S9-S12.
// ============================================================================

import { describe, it, expect } from "vitest";

import {
	resolveHotelCoordinates,
	HotelCoordSource,
	CoordRecord,
} from "@/lib/hotel-coordinates";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCatalogRecord(
	id: string,
	lat: number,
	lng: number,
	precision = "city",
): CoordRecord {
	return { id, lat, lng, precision };
}

function makeLocationRecord(
	hotel_id: string,
	lat: number,
	lng: number,
	precision = "city",
): CoordRecord & { hotel_id: string } {
	return { id: hotel_id, hotel_id, lat, lng, precision };
}

// ─── S9: Hotel with coordinates only in hotel_locations appears as marker ────

describe("S9: Hotel with coordinates in hotel_locations", () => {
	it("resolves coordinates from hotel_locations fallback when ota_catalog has none", () => {
		const catalog: CoordRecord[] = [];
		const locations: (CoordRecord & { hotel_id: string })[] = [
			makeLocationRecord("arrayan3", 5.8245, -73.0323, "city"),
		];

		const result = resolveHotelCoordinates(["arrayan3"], catalog, locations);

		expect(result.get("arrayan3")).toEqual({
			lat: 5.8245,
			lng: -73.0323,
			precision: "city",
			source: "hotel_locations" as HotelCoordSource,
		});
	});
});

// ─── S10: Hotel with coords in both uses ota_catalog ─────────────────────────

describe("S10: ota_catalog takes precedence over hotel_locations", () => {
	it("uses ota_catalog when both sources have coordinates", () => {
		const catalog: CoordRecord[] = [
			makeCatalogRecord("arrayan3", 6.1234, -75.5678, "rooftop"),
		];
		const locations: (CoordRecord & { hotel_id: string })[] = [
			makeLocationRecord("arrayan3", 5.8245, -73.0323, "city"),
		];

		const result = resolveHotelCoordinates(["arrayan3"], catalog, locations);

		expect(result.get("arrayan3")).toEqual({
			lat: 6.1234,
			lng: -75.5678,
			precision: "rooftop",
			source: "ota_catalog" as HotelCoordSource,
		});
	});
});

// ─── S11: Hotel with no coordinates in either table → no marker ──────────────

describe("S11: No coordinates in either source", () => {
	it("returns undefined for hotel with no coordinates in either table", () => {
		const catalog: CoordRecord[] = [];
		const locations: (CoordRecord & { hotel_id: string })[] = [];

		const result = resolveHotelCoordinates(
			["no-coords-hotel"],
			catalog,
			locations,
		);

		expect(result.has("no-coords-hotel")).toBe(false);
	});
});

// ─── S12: Mixed coordinate sources render correct marker count ───────────────

describe("S12: Mixed coordinate sources", () => {
	it("renders markers for hotels with coordinates from any source", () => {
		const catalog: CoordRecord[] = [
			makeCatalogRecord("h1", 1.1, 1.1),
			makeCatalogRecord("h2", 2.2, 2.2),
			makeCatalogRecord("h3", 3.3, 3.3),
			makeCatalogRecord("h4", 4.4, 4.4),
			makeCatalogRecord("h5", 5.5, 5.5),
		];
		const locations: (CoordRecord & { hotel_id: string })[] = [
			makeLocationRecord("h6", 6.6, 6.6),
			makeLocationRecord("h7", 7.7, 7.7),
			makeLocationRecord("h8", 8.8, 8.8),
		];

		const hotelIds = [
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"h7",
			"h8",
			"h9",
			"h10",
		];
		const result = resolveHotelCoordinates(hotelIds, catalog, locations);

		// 8 hotels have coordinates (5 catalog + 3 locations)
		expect(result.size).toBe(8);

		// h9 and h10 have no coordinates → excluded
		expect(result.has("h9")).toBe(false);
		expect(result.has("h10")).toBe(false);

		// hotel_locations markers carry precision indicator
		expect(result.get("h6")?.source).toBe("hotel_locations");
		expect(result.get("h7")?.source).toBe("hotel_locations");
		expect(result.get("h8")?.source).toBe("hotel_locations");
	});

	it("handles empty inputs without error", () => {
		const result = resolveHotelCoordinates([], [], []);
		expect(result.size).toBe(0);
	});

	it("skips catalog entries with null lat/lng (treats as missing)", () => {
		const catalog: CoordRecord[] = [
			{
				id: "h1",
				lat: null as unknown as number,
				lng: null as unknown as number,
				precision: "city",
			},
			{ id: "h2", lat: 2.2, lng: 2.2, precision: "city" },
		];
		const locations: (CoordRecord & { hotel_id: string })[] = [];

		const result = resolveHotelCoordinates(["h1", "h2"], catalog, locations);

		expect(result.size).toBe(1);
		expect(result.has("h2")).toBe(true);
		expect(result.has("h1")).toBe(false);
	});

	it("skips location entries with null lat/lng", () => {
		const catalog: CoordRecord[] = [];
		const locations: (CoordRecord & { hotel_id: string })[] = [
			makeLocationRecord(
				"h1",
				null as unknown as number,
				null as unknown as number,
				"city",
			),
			makeLocationRecord("h2", 2.2, 2.2, "city"),
		];

		const result = resolveHotelCoordinates(["h1", "h2"], catalog, locations);

		expect(result.size).toBe(1);
		expect(result.has("h2")).toBe(true);
		expect(result.has("h1")).toBe(false);
	});

	it("hotel_locations does not override an existing ota_catalog entry", () => {
		const catalog: CoordRecord[] = [
			makeCatalogRecord("h1", 1.1, 1.1, "rooftop"),
		];
		const locations: (CoordRecord & { hotel_id: string })[] = [
			makeLocationRecord("h1", 9.9, 9.9, "city"),
		];

		const result = resolveHotelCoordinates(["h1"], catalog, locations);

		expect(result.size).toBe(1);
		expect(result.get("h1")?.source).toBe("ota_catalog");
		expect(result.get("h1")?.lat).toBe(1.1);
	});
});
