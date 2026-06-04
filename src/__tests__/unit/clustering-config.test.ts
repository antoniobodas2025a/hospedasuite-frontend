// ============================================================================
// 🧪 Tests Unitarios: Clustering Configuration
//
// Tests for marker cluster configuration constants.
// S5-S8: Gesture behavior depends on disableClusteringAtZoom threshold.
// ============================================================================

import { describe, it, expect } from "vitest";

import { CLUSTERING_CONFIG } from "@/lib/clustering-config";

describe("S8: Marker clusters break apart at the configured zoom threshold", () => {
	it("disableClusteringAtZoom is 15 (uncluster later for cleaner map)", () => {
		expect(CLUSTERING_CONFIG.disableClusteringAtZoom).toBe(15);
	});

	it("maxClusterRadius is 120 (wider grouping, less visual clutter)", () => {
		expect(CLUSTERING_CONFIG.maxClusterRadius).toBe(120);
	});

	it("showCoverageOnHover is false (no visual noise)", () => {
		expect(CLUSTERING_CONFIG.showCoverageOnHover).toBe(false);
	});

	it("zoomToBoundsOnClick is true (expand cluster on click)", () => {
		expect(CLUSTERING_CONFIG.zoomToBoundsOnClick).toBe(true);
	});

	it("spiderfyOnMaxZoom is true (spread markers at max zoom)", () => {
		expect(CLUSTERING_CONFIG.spiderfyOnMaxZoom).toBe(true);
	});
});
