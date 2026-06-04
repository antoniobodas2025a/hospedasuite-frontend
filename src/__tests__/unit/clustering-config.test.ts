// ============================================================================
// 🧪 Tests Unitarios: Clustering Configuration
//
// Tests for marker cluster configuration constants.
// S5-S8: Gesture behavior depends on disableClusteringAtZoom threshold.
// ============================================================================

import { describe, it, expect } from 'vitest';

import { CLUSTERING_CONFIG } from '@/lib/clustering-config';

describe('S8: Marker clusters break apart at the configured zoom threshold', () => {
  it('disableClusteringAtZoom is 11 (uncluster sooner for better gestures)', () => {
    expect(CLUSTERING_CONFIG.disableClusteringAtZoom).toBe(11);
  });

  it('maxClusterRadius is 80 (tight clusters for dense areas)', () => {
    expect(CLUSTERING_CONFIG.maxClusterRadius).toBe(80);
  });

  it('showCoverageOnHover is false (no visual noise)', () => {
    expect(CLUSTERING_CONFIG.showCoverageOnHover).toBe(false);
  });

  it('zoomToBoundsOnClick is true (expand cluster on click)', () => {
    expect(CLUSTERING_CONFIG.zoomToBoundsOnClick).toBe(true);
  });

  it('spiderfyOnMaxZoom is true (spread markers at max zoom)', () => {
    expect(CLUSTERING_CONFIG.spiderfyOnMaxZoom).toBe(true);
  });
});
