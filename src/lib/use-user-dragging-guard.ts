'use client';

/**
 * Module-level ref shared between MapDragDetector and MapTransitionController.
 * Prevents flyTo when user is actively dragging/zooming the map.
 *
 * Pattern: same as useSharedMoveGuard — module-level mutability with
 * React hooks for reactive access.
 */
const userDraggingRef = { current: false };

export function useUserDraggingGuard() {
  return {
    isDragging: userDraggingRef as React.RefObject<boolean>,
    setDragging: () => { userDraggingRef.current = true; },
    clearDragging: () => { userDraggingRef.current = false; },
  };
}
