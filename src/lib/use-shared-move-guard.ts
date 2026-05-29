'use client';

import { useCallback } from 'react';

/**
 * Module-level mutable ref shared across all consumers of useSharedMoveGuard.
 *
 * Purpose: coordinates `isInternalMove` between MapSearchSync (which reads it
 * to suppress false moveend triggers) and MapTransitionController (which sets it
 * before programmatic flyTo/flyToBounds calls).
 *
 * Without this shared guard, flyTo triggers moveend in MapSearchSync, which then
 * fires onMapBoundsChange, creating a feedback loop.
 */
const sharedMoveGuard = { current: false };

/**
 * Shared move guard hook for map components.
 *
 * Returns a `RefObject<boolean>` (readonly from the consumer's perspective)
 * plus setter/clearer helpers that mutate the module-level state.
 *
 * @example
 * // In MapTransitionController (setter)
 * const { setInternalMove } = useSharedMoveGuard();
 * setInternalMove(); // before flyTo
 *
 * // In MapSearchSync (reader)
 * const { isInternalMove, clearInternalMove } = useSharedMoveGuard();
 * if (isInternalMove.current) { clearInternalMove(); return; }
 */
export function useSharedMoveGuard() {
  return {
    isInternalMove: sharedMoveGuard as React.RefObject<boolean>,
    setInternalMove: useCallback(() => {
      sharedMoveGuard.current = true;
    }, []),
    clearInternalMove: useCallback(() => {
      sharedMoveGuard.current = false;
    }, []),
  };
}
