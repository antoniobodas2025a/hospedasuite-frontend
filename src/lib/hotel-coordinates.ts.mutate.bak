/**
 * Hotel Coordinate Resolution — Two-tier lookup for map markers.
 *
 * S9-S12: Resolves coordinates from ota_catalog (primary) with
 * hotel_locations fallback. Used by ota.ts actions and MarkerLifecycleManager.
 */

export type HotelCoordSource = "ota_catalog" | "hotel_locations";

export interface CoordRecord {
	id: string;
	lat: number;
	lng: number;
	precision: string;
}

export interface ResolvedCoord {
	lat: number;
	lng: number;
	precision: string;
	source: HotelCoordSource;
}

/**
 * Resolve coordinates for the given hotel IDs using a two-tier lookup.
 *
 * - Primary: ota_catalog (precomputed, cached, higher precision)
 * - Fallback: hotel_locations (from onboarding wizard geocoding)
 *
 * Hotels without coordinates in either source are excluded from the result.
 */
export function resolveHotelCoordinates(
	hotelIds: string[],
	catalogData: CoordRecord[],
	locationData: (CoordRecord & { hotel_id: string })[],
): Map<string, ResolvedCoord> {
	const coordsMap = new Map<string, ResolvedCoord>();

	// Primary: ota_catalog
	for (const row of catalogData) {
		if (row.lat != null && row.lng != null) {
			coordsMap.set(row.id, {
				lat: row.lat,
				lng: row.lng,
				precision: row.precision,
				source: "ota_catalog",
			});
		}
	}

	// Fallback: hotel_locations (only for IDs not yet resolved)
	const idsWithoutCoords = hotelIds.filter((id) => !coordsMap.has(id));
	for (const row of locationData) {
		if (
			idsWithoutCoords.includes(row.hotel_id) &&
			row.lat != null &&
			row.lng != null
		) {
			coordsMap.set(row.hotel_id, {
				lat: row.lat,
				lng: row.lng,
				precision: row.precision,
				source: "hotel_locations",
			});
		}
	}

	return coordsMap;
}
