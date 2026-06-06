// Vitest 4 → Bun compatibility polyfills
// Bun's embedded vitest doesn't support vi.stubGlobal/vi.importActual.
// These polyfills bridge the gap until Bun catches up.

import { vi } from "vitest";

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
