/**
 * Clustering Configuration — Centralized constants for MarkerLifecycleManager.
 *
 * S5-S8: Gesture responsiveness depends on these thresholds.
 * - disableClusteringAtZoom: 11 → markers uncluster sooner for smooth pan/zoom
 * - maxClusterRadius: 80 → tight clusters for dense areas
 */

export const CLUSTERING_CONFIG = {
	/** Zoom level at which clustering is disabled — individual markers shown */
	disableClusteringAtZoom: 15,

	/** Maximum radius (px) for a cluster to cover — higher = more aggressive grouping */
	maxClusterRadius: 120,

	/** Show coverage area polygon on hover */
	showCoverageOnHover: false,

	/** Zoom to cluster bounds when clicked */
	zoomToBoundsOnClick: true,

	/** Spiderfy markers when zoomed to max */
	spiderfyOnMaxZoom: true,

	/** Enable chunked loading for large marker sets */
	chunkedLoading: true,

	/** Interval between chunks (ms) */
	chunkInterval: 100,

	/** Delay before chunk processing (ms) */
	chunkDelay: 50,
} as const;
