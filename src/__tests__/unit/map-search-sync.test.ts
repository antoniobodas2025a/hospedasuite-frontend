// ============================================================================
// 🧪 Tests Unitarios: Map Search Sync Logic
//
// Tests the debouncing and internal move detection logic used by MapSearchSync.
// Pure function tests — no React, no DOM, no Leaflet.
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Simulated debounce logic extracted from MapSearchSync
interface MoveEvent {
  timestamp: number;
  type: 'move' | 'zoom';
}

interface SyncState {
  pendingReverseGeocode: boolean;
  lastMoveTimestamp: number;
  isInternalMove: boolean;
}

function createSyncState(): SyncState {
  return {
    pendingReverseGeocode: false,
    lastMoveTimestamp: 0,
    isInternalMove: false,
  };
}

function handleMoveStart(state: SyncState, moveTimeout: ReturnType<typeof setTimeout> | null): void {
  // Clear pending reverse geocode on new move
  if (moveTimeout) {
    clearTimeout(moveTimeout);
  }
}

function handleMoveEnd(
  state: SyncState,
  moveTimeout: { current: ReturnType<typeof setTimeout> | null },
  enableSearchOnMove: boolean,
  moveDebounceMs: number,
  onReverseGeocode: () => void
): void {
  // Skip if this was an internal programmatic move (flyTo, fitBounds)
  if (state.isInternalMove) {
    state.isInternalMove = false;
    return;
  }

  state.lastMoveTimestamp = Date.now();

  // Optional: reverse geocode and update search area
  if (enableSearchOnMove) {
    if (moveTimeout.current) {
      clearTimeout(moveTimeout.current);
    }

    moveTimeout.current = setTimeout(() => {
      state.pendingReverseGeocode = true;
      onReverseGeocode();
    }, moveDebounceMs);
  }
}

describe('Map Search Sync Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Internal Move Detection', () => {
    it('skips reverse geocoding when move is internal (programmatic)', () => {
      const state = createSyncState();
      state.isInternalMove = true;
      const moveTimeout = { current: null };
      const onReverseGeocode = vi.fn();

      handleMoveEnd(state, moveTimeout, true, 1000, onReverseGeocode);

      expect(state.isInternalMove).toBe(false);
      expect(moveTimeout.current).toBeNull();
      expect(onReverseGeocode).not.toHaveBeenCalled();
    });

    it('triggers reverse geocoding when move is user-initiated', () => {
      const state = createSyncState();
      const moveTimeout = { current: null };
      const onReverseGeocode = vi.fn();

      handleMoveEnd(state, moveTimeout, true, 1000, onReverseGeocode);

      expect(moveTimeout.current).not.toBeNull();

      // Advance timers past debounce
      vi.advanceTimersByTime(1000);

      expect(state.pendingReverseGeocode).toBe(true);
      expect(onReverseGeocode).toHaveBeenCalled();
    });
  });

  describe('Debouncing', () => {
    it('debounces rapid moves (only last one triggers)', () => {
      const state = createSyncState();
      const moveTimeout = { current: null };
      const onReverseGeocode = vi.fn();

      // Simulate rapid moves
      handleMoveEnd(state, moveTimeout, true, 500, onReverseGeocode);
      handleMoveEnd(state, moveTimeout, true, 500, onReverseGeocode);
      handleMoveEnd(state, moveTimeout, true, 500, onReverseGeocode);

      // Only one timeout should be active
      expect(onReverseGeocode).not.toHaveBeenCalled();

      // Advance past debounce
      vi.advanceTimersByTime(500);

      // Should only have been called once (the last move)
      expect(onReverseGeocode).toHaveBeenCalledTimes(1);
    });

    it('clears pending reverse geocode on moveStart', () => {
      const state = createSyncState();
      const moveTimeout = { current: null as ReturnType<typeof setTimeout> | null };
      const onReverseGeocode = vi.fn();

      // Start a move
      handleMoveEnd(state, moveTimeout, true, 500, onReverseGeocode);
      expect(moveTimeout.current).not.toBeNull();

      // User starts another move before debounce completes
      handleMoveStart(state, moveTimeout.current);

      // handleMoveStart calls clearTimeout on the timeout
      // In fake timer mode, the timeout object still exists but is cleared
      // The key is that onReverseGeocode should NOT be called
      vi.advanceTimersByTime(500);

      // Should not have been called because the timeout was cleared
      expect(onReverseGeocode).not.toHaveBeenCalled();
    });
  });

  describe('Search on Move Toggle', () => {
    it('does not trigger reverse geocoding when enableSearchOnMove is false', () => {
      const state = createSyncState();
      const moveTimeout = { current: null };
      const onReverseGeocode = vi.fn();

      handleMoveEnd(state, moveTimeout, false, 1000, onReverseGeocode);

      expect(moveTimeout.current).toBeNull();
      expect(onReverseGeocode).not.toHaveBeenCalled();
    });

    it('triggers reverse geocoding when enableSearchOnMove is true', () => {
      const state = createSyncState();
      const moveTimeout = { current: null };
      const onReverseGeocode = vi.fn();

      handleMoveEnd(state, moveTimeout, true, 1000, onReverseGeocode);

      expect(moveTimeout.current).not.toBeNull();

      vi.advanceTimersByTime(1000);

      expect(onReverseGeocode).toHaveBeenCalled();
    });
  });

  describe('State Transitions', () => {
    it('resets isInternalMove flag after processing', () => {
      const state = createSyncState();
      state.isInternalMove = true;
      const moveTimeout = { current: null };
      const onReverseGeocode = vi.fn();

      handleMoveEnd(state, moveTimeout, true, 1000, onReverseGeocode);

      expect(state.isInternalMove).toBe(false);
    });

    it('updates lastMoveTimestamp on user move', () => {
      const state = createSyncState();
      const moveTimeout = { current: null };
      const onReverseGeocode = vi.fn();

      const beforeTimestamp = Date.now();
      handleMoveEnd(state, moveTimeout, true, 1000, onReverseGeocode);
      const afterTimestamp = Date.now();

      expect(state.lastMoveTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(state.lastMoveTimestamp).toBeLessThanOrEqual(afterTimestamp);
    });
  });
});
