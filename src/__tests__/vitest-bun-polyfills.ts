// Vitest 4 → Bun compatibility polyfills
// Bun's embedded vitest doesn't support vi.stubGlobal/vi.importActual.
// These polyfills bridge the gap until Bun catches up.

import { vi } from "vitest";

// Mock server-only globally to prevent "cannot be imported from Client Component" errors
vi.mock('server-only', () => ({}));

// stubGlobal: set a property on globalThis
if (!vi.stubGlobal) {
	(vi as unknown as Record<string, unknown>).stubGlobal = (
		key: string,
		value: unknown,
	) => {
		const original = (globalThis as Record<string, unknown>)[key];
		(globalThis as Record<string, unknown>)[key] = value;
		return original;
	};
}

// unstubAllGlobals: no-op in Bun (globals are reset per test file)
if (!vi.unstubAllGlobals) {
	(vi as unknown as Record<string, unknown>).unstubAllGlobals = () => {};
}

// importActual: use dynamic import
if (!vi.importActual) {
	(vi as unknown as Record<string, unknown>).importActual = async (
		module: string,
	) => {
		return await import(module);
	};
}

// waitFor: use polling
if (!vi.waitFor) {
	(vi as unknown as Record<string, unknown>).waitFor = async (
		callback: () => void | Promise<void>,
		options?: { timeout?: number; interval?: number },
	) => {
		const timeout = options?.timeout ?? 1000;
		const interval = options?.interval ?? 50;
		const start = Date.now();
		let lastError: Error | undefined;

		while (Date.now() - start < timeout) {
			try {
				await callback();
				return;
			} catch (e) {
				lastError = e as Error;
				await new Promise((r) => setTimeout(r, interval));
			}
		}
		throw lastError ?? new Error(`waitFor timed out after ${timeout}ms`);
	};
}

// ── DOM polyfills for Bun (no browser APIs) ───────────────────────────────

// sessionStorage mock
if (typeof globalThis.sessionStorage === "undefined") {
	const store = new Map<string, string>();
	(globalThis as Record<string, unknown>).sessionStorage = {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => store.set(key, value),
		removeItem: (key: string) => store.delete(key),
		clear: () => store.clear(),
		get length() {
			return store.size;
		},
	};
}

// ── Leaflet mock for bounds-filter tests (no DOM in Bun) ──────────────────

(globalThis as Record<string, unknown>).L = {
	LatLngBounds: class {
		private _sw: { lat: number; lng: number };
		private _ne: { lat: number; lng: number };
		constructor(sw: [number, number], ne: [number, number]) {
			this._sw = { lat: sw[0], lng: sw[1] };
			this._ne = { lat: ne[0], lng: ne[1] };
		}
		contains(point: [number, number] | { lat: number; lng: number }) {
			const p = Array.isArray(point) ? { lat: point[0], lng: point[1] } : point;
			return (
				p.lat >= this._sw.lat &&
				p.lat <= this._ne.lat &&
				p.lng >= this._sw.lng &&
				p.lng <= this._ne.lng
			);
		}
		getSouthWest() {
			return this._sw;
		}
		getNorthEast() {
			return this._ne;
		}
	},
};
