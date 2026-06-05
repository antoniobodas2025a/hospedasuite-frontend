"use client";

/**
 * Coordinate Firewall — module-level state for map sovereignty.
 *
 * Architectural principle: the map is NON-CONTROLLED during user gestures.
 * URL is a mirror, not a command. RSC echoes with stale coordinates are ignored.
 *
 * Token-based intent validation (replaces timestamp-only approach):
 *   - setSearchIntent(token): called when user explicitly searches a location
 *   - purgeIntent(): called on physical contact (mousedown/touchstart)
 *   - isIntentValid(token): only flyTo if token matches + within 15s window
 *
 * §5 from Master Plan: Sovereignty via Search Intent Stamp (T_url ≡ T_local)
 */

const state = {
	isDragging: false,
	lastInteraction: 0,
	activeIntent: null as string | null,
	intentTimestamp: 0,
};

const INTERACTION_WINDOW_MS = 15000;

export function useMapCoordinateFirewall() {
	return {
		isDragging: { current: state.isDragging } as React.RefObject<boolean>,

		/** Called on physical contact — stops animation, kills intent, restores handlers */
		stabilizeInteractions: (map: { stop: () => void }) => {
			state.isDragging = true;
			state.lastInteraction = Date.now();
			state.activeIntent = null;
			map.stop();
		},

		/** Called when drag/zoom ends */
		releaseInteraction: () => {
			state.isDragging = false;
		},

		/** Called when user explicitly searches for a location */
		setSearchIntent: (token: string) => {
			state.activeIntent = token;
			state.intentTimestamp = Date.now();
		},

		/** Check if a programmatic flyTo is allowed for this token */
		isIntentValid: (token: string) => {
			if (state.activeIntent !== token) return false;
			return Date.now() - state.intentTimestamp < INTERACTION_WINDOW_MS;
		},

		/** Block ANY programmatic flyTo if user touched map recently */
		shouldBlockFlyTo: () => {
			return Date.now() - state.lastInteraction < INTERACTION_WINDOW_MS;
		},
	};
}
