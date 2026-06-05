"use client";

/**
 * Module-level state shared between MapDragDetector and MapTransitionController.
 *
 * - isDragging: true during active drag/zoom — abort flyTo immediately
 * - lastInteraction: timestamp of last user gesture — block flyTo for 15s window
 *
 * Pattern: URL is a suggestion, not a command. User gestures always win.
 * Covers 13.8s latency window from the latency audit.
 */

const state = {
	isDragging: false,
	lastInteraction: 0,
};

const INTERACTION_WINDOW_MS = 15000; // 15 seconds — covers 13.8s observed latency

export function useUserDraggingGuard() {
	return {
		isDragging: { current: state.isDragging } as React.RefObject<boolean>,

		setDragging: () => {
			state.isDragging = true;
			state.lastInteraction = Date.now();
		},

		clearDragging: () => {
			state.isDragging = false;
			// Note: lastInteraction is NOT cleared — it persists for the 15s window
		},

		/** Block programmatic flyTo if user touched map recently */
		shouldBlockFlyTo: () => {
			return Date.now() - state.lastInteraction < INTERACTION_WINDOW_MS;
		},
	};
}
