// ============================================================================
// 🧪 Tests Unitarios: GeoCacheManager
//
// Tests the 3-level geocoding cache:
// 1. Pre-computed (150+ Colombian cities)
// 2. In-memory (current session)
// 3. Session storage (survives refresh, 24h TTL)
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCachedCoords,
  setCachedCoords,
  clearGeoCache,
  getGeoCacheStats,
} from '@/lib/geo-cache';

describe('GeoCacheManager', () => {
  beforeEach(() => {
    clearGeoCache();
    // Mock sessionStorage
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getCachedCoords', () => {
    it('returns pre-computed coords for major cities (with accent)', () => {
      const result = getCachedCoords('Medellín');
      expect(result).toEqual({
        lat: 6.2442,
        lng: -75.5812,
        displayName: 'Medellín',
      });
    });

    it('returns pre-computed coords for major cities (without accent)', () => {
      const result = getCachedCoords('medellin');
      expect(result).toEqual({
        lat: 6.2442,
        lng: -75.5812,
        displayName: 'medellin',
      });
    });

    it('returns pre-computed coords for Bogotá', () => {
      const result = getCachedCoords('Bogotá');
      expect(result).toBeDefined();
      expect(result?.lat).toBe(4.6097);
      expect(result?.lng).toBe(-74.0817);
    });

    it('returns pre-computed coords for Cartagena', () => {
      const result = getCachedCoords('Cartagena');
      expect(result).toBeDefined();
      expect(result?.lat).toBe(10.3910);
    });

    it('returns pre-computed coords for tourist hotspots', () => {
      const result = getCachedCoords('Salento');
      expect(result).toBeDefined();
      expect(result?.lat).toBe(4.6333);
    });

    it('returns null for unknown cities (not in pre-computed, memory, or session)', () => {
      const result = getCachedCoords('CiudadInventada123');
      expect(result).toBeNull();
    });

    it('matches accent-insensitive queries', () => {
      const withAccent = getCachedCoords('Medellín');
      const withoutAccent = getCachedCoords('medellin');
      expect(withAccent?.lat).toBe(withoutAccent?.lat);
      expect(withAccent?.lng).toBe(withoutAccent?.lng);
    });

    it('handles uppercase queries', () => {
      const result = getCachedCoords('MEDELLIN');
      expect(result).toBeDefined();
      expect(result?.lat).toBe(6.2442);
    });

    it('handles mixed case queries', () => {
      const result = getCachedCoords('MeDeLlÍn');
      expect(result).toBeDefined();
      expect(result?.lat).toBe(6.2442);
    });
  });

  describe('setCachedCoords', () => {
    it('stores coords in memory cache', () => {
      setCachedCoords('TestCity', { lat: 1.0, lng: 2.0, displayName: 'TestCity' });
      const result = getCachedCoords('TestCity');
      expect(result).toEqual({
        lat: 1.0,
        lng: 2.0,
        displayName: 'TestCity',
      });
    });

    it('pre-computed cache takes precedence over memory cache', () => {
      // Pre-computed: Medellín → 6.2442, -75.5812
      setCachedCoords('Medellín', { lat: 99.0, lng: 99.0, displayName: 'Custom' });
      const result = getCachedCoords('Medellín');
      // Pre-computed takes precedence (Level 1 > Level 2)
      expect(result?.lat).toBe(6.2442);
      expect(result?.lng).toBe(-75.5812);
    });

    it('normalizes query before storing', () => {
      setCachedCoords('Test City', { lat: 1.0, lng: 2.0, displayName: 'Test City' });
      const result = getCachedCoords('test city');
      expect(result).toBeDefined();
      expect(result?.lat).toBe(1.0);
    });
  });

  describe('clearGeoCache', () => {
    it('clears memory cache', () => {
      setCachedCoords('TestCity', { lat: 1.0, lng: 2.0, displayName: 'TestCity' });
      clearGeoCache();
      const result = getCachedCoords('TestCity');
      // After clearing, should fall back to pre-computed (null for TestCity)
      expect(result).toBeNull();
    });

    it('does not clear pre-computed cache', () => {
      clearGeoCache();
      const result = getCachedCoords('Medellín');
      expect(result).toBeDefined();
      expect(result?.lat).toBe(6.2442);
    });
  });

  describe('getGeoCacheStats', () => {
    it('returns correct pre-computed size', () => {
      const stats = getGeoCacheStats();
      expect(stats.precomputedSize).toBeGreaterThan(100);
    });

    it('returns memory size after adding coords', () => {
      setCachedCoords('City1', { lat: 1.0, lng: 1.0, displayName: 'City1' });
      setCachedCoords('City2', { lat: 2.0, lng: 2.0, displayName: 'City2' });
      const stats = getGeoCacheStats();
      expect(stats.memorySize).toBe(2);
    });

    it('returns zero memory size after clear', () => {
      setCachedCoords('City1', { lat: 1.0, lng: 1.0, displayName: 'City1' });
      clearGeoCache();
      const stats = getGeoCacheStats();
      expect(stats.memorySize).toBe(0);
    });
  });
});
