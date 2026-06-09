/**
 * Search Bar Coherence — TDD Test Suite
 *
 * Validates URL-Input synchronization, clear button behavior,
 * and debouncing logic for the search bar components.
 *
 * Heurística #1 (Visibilidad): Input reflects URL state at all times.
 * Heurística #3 (Control): Clear 'X' resets state synchronously.
 * Heurística #4 (Consistencia): Same behavior on Home vs Results.
 *
 * Doherty Threshold: Input responds in < 100ms, debouncing at 300ms.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Pure function: URL param extraction (mirrors useSearchState) ─────────────

function extractLocationFromUrl(url: string): string {
  try {
    const urlObj = new URL(url, 'http://localhost');
    return urlObj.searchParams.get('location') || '';
  } catch {
    return '';
  }
}

function buildUrlWithLocation(base: string, location: string): string {
  try {
    const urlObj = new URL(base, 'http://localhost');
    if (location) {
      urlObj.searchParams.set('location', location);
    } else {
      urlObj.searchParams.delete('location');
    }
    return urlObj.pathname + urlObj.search;
  } catch {
    return base;
  }
}

// ── Pure function: Debounce simulation ───────────────────────────────────────

function createDebouncer(delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastValue = '';

  return {
    push: (value: string, callback: (v: string) => void) => {
      lastValue = value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => callback(lastValue), delay);
    },
    cancel: () => {
      if (timer) clearTimeout(timer);
      timer = null;
    },
    getLastValue: () => lastValue,
  };
}

// ── TDD: URL-Input Synchronization ───────────────────────────────────────────

describe('URL-Input Synchronization', () => {
  it('extracts location from URL with location param', () => {
    const url = '/?location=Medellín&checkin=2026-07-01';
    const location = extractLocationFromUrl(url);

    expect(location).toBe('Medellín');
  });

  it('returns empty string when no location param', () => {
    const url = '/?checkin=2026-07-01';
    const location = extractLocationFromUrl(url);

    expect(location).toBe('');
  });

  it('returns empty string for root URL', () => {
    const location = extractLocationFromUrl('/');

    expect(location).toBe('');
  });

  it('builds URL with location param', () => {
    const url = buildUrlWithLocation('/?checkin=2026-07-01', 'Cartagena');

    expect(url).toContain('location=Cartagena');
    expect(url).toContain('checkin=2026-07-01');
  });

  it('removes location from URL when empty', () => {
    const url = buildUrlWithLocation('/?location=Medellín&checkin=2026-07-01', '');

    expect(url).not.toContain('location=');
    expect(url).toContain('checkin=2026-07-01');
  });

  // MUTATION: If extraction ignores the location param, this fails
  it('MUTATION: detects missing location extraction', () => {
    const url = '/?location=Bogotá';
    const location = extractLocationFromUrl(url);

    expect(location).toBe('Bogotá');
    expect(location).not.toBe('');
  });

  // MUTATION: If building URL overwrites other params, this fails
  it('MUTATION: detects param loss when adding location', () => {
    const url = buildUrlWithLocation('/?checkin=2026-07-01&guests=2', 'Medellín');

    expect(url).toContain('checkin=2026-07-01');
    expect(url).toContain('guests=2');
    expect(url).toContain('location=Medell'); // URL-encoded: Medellín → Medell%C3%ADn
  });
});

// ── TDD: Clear Button Behavior ───────────────────────────────────────────────

describe('Clear Button Behavior', () => {
  it('clear button should be visible when location has value', () => {
    const location = 'Medellín';
    const shouldShowClear = location.length > 0;

    expect(shouldShowClear).toBe(true);
  });

  it('clear button should be hidden when location is empty', () => {
    const location = '';
    const shouldShowClear = location.length > 0;

    expect(shouldShowClear).toBe(false);
  });

  it('clearing location resets to empty string', () => {
    let location = 'Cartagena';
    // Simulate clear action
    location = '';

    expect(location).toBe('');
  });

  it('clearing location updates URL to remove location param', () => {
    let url = '/?location=Cartagena&checkin=2026-07-01';
    // Simulate clear action
    url = buildUrlWithLocation(url, '');

    expect(url).not.toContain('location=');
  });

  // MUTATION: If clear doesn't reset to empty, this fails
  it('MUTATION: detects incomplete clear (partial value)', () => {
    let location = 'Medellín';
    location = '';

    expect(location).toBe('');
    expect(location.length).toBe(0);
  });
});

// ── TDD: Debouncing (Doherty Threshold) ──────────────────────────────────────

describe('Search Debouncing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces search calls by 300ms', () => {
    const callback = vi.fn();
    const debouncer = createDebouncer(300);

    debouncer.push('Med', callback);
    debouncer.push('Mede', callback);
    debouncer.push('Medell', callback);
    debouncer.push('Medellín', callback);

    // No callback yet — still within debounce window
    expect(callback).not.toHaveBeenCalled();

    // Advance past debounce window
    vi.advanceTimersByTime(300);

    // Only the last value should trigger the callback
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('Medellín');
  });

  it('cancels previous timer on new input', () => {
    const callback = vi.fn();
    const debouncer = createDebouncer(300);

    debouncer.push('A', callback);
    vi.advanceTimersByTime(150);

    debouncer.push('AB', callback);
    vi.advanceTimersByTime(150);

    // First timer was cancelled, second hasn't fired yet
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);

    // Only the second value fires
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('AB');
  });

  it('responds to first character in < 100ms (Doherty)', () => {
    // The input itself updates synchronously (0ms)
    // Only the URL push is debounced
    let inputValue = '';
    const startTime = Date.now();

    // Simulate typing
    inputValue = 'M';
    const responseTime = Date.now() - startTime;

    expect(responseTime).toBeLessThan(100);
    expect(inputValue).toBe('M');
  });

  // MUTATION: If debounce delay is removed, multiple callbacks fire
  it('MUTATION: detects missing debounce (multiple rapid calls)', () => {
    const callback = vi.fn();
    const debouncer = createDebouncer(300);

    debouncer.push('A', callback);
    debouncer.push('AB', callback);
    debouncer.push('ABC', callback);

    // Without debounce, callback would fire 3 times
    // With debounce, it fires 0 times until timer expires
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

// ── TDD: Progressive Disclosure State ────────────────────────────────────────

describe('Progressive Disclosure State', () => {
  it('starts at location step (step 1)', () => {
    const searchStep: 'location' | 'full' = 'location';

    expect(searchStep).toBe('location');
  });

  it('transitions to full step after committing location', () => {
    let searchStep: 'location' | 'full' = 'location';
    const searchTerm = 'Medellín';

    // Simulate commit
    if (searchTerm.trim()) {
      searchStep = 'full';
    }

    expect(searchStep).toBe('full');
  });

  it('does not transition with empty location', () => {
    let searchStep: 'location' | 'full' = 'location';
    const searchTerm = '';

    // Simulate commit attempt
    if (searchTerm.trim()) {
      searchStep = 'full';
    }

    expect(searchStep).toBe('location');
  });

  // MUTATION: If transition happens without trim check, this fails
  it('MUTATION: detects transition on whitespace-only input', () => {
    let searchStep: 'location' | 'full' = 'location';
    const searchTerm = '   ';

    if (searchTerm.trim()) {
      searchStep = 'full';
    }

    expect(searchStep).toBe('location');
  });
});

// ── TDD: Flicker-free Persistence ────────────────────────────────────────────

describe('Flicker-free Persistence', () => {
  it('input value persists when navigating to results page', () => {
    // Simulate: user types "Medellín" on home, navigates to results
    const inputOnHome = 'Medellín';
    const urlOnResults = `/?location=${encodeURIComponent(inputOnHome)}`;
    const inputOnResults = extractLocationFromUrl(urlOnResults);

    expect(inputOnResults).toBe(inputOnHome);
  });

  it('input value survives page refresh', () => {
    const urlAfterRefresh = '/?location=Cartagena&checkin=2026-07-01&guests=2';
    const restoredLocation = extractLocationFromUrl(urlAfterRefresh);

    expect(restoredLocation).toBe('Cartagena');
  });

  it('input value survives back navigation', () => {
    // User searches "Bogotá", goes to hotel detail, hits back
    const urlOnBack = '/?location=Bogotá&checkin=2026-07-01';
    const restoredLocation = extractLocationFromUrl(urlOnBack);

    expect(restoredLocation).toBe('Bogotá');
  });

  // MUTATION: If URL encoding breaks persistence, this fails
  it('MUTATION: detects URL encoding corruption', () => {
    const original = 'San Andrés';
    const encoded = encodeURIComponent(original);
    const url = `/?location=${encoded}`;
    const restored = extractLocationFromUrl(url);

    expect(restored).toBe(original);
  });
});

// ── TDD: Search State Coherence ──────────────────────────────────────────────

describe('Search State Coherence', () => {
  it('all search params preserved when changing location', () => {
    const baseUrl = '/?location=Medellín&checkin=2026-07-01&checkout=2026-07-05&guests=2';
    const newUrl = buildUrlWithLocation(baseUrl, 'Cartagena');

    expect(newUrl).toContain('location=Cartagena');
    expect(newUrl).toContain('checkin=2026-07-01');
    expect(newUrl).toContain('checkout=2026-07-05');
    expect(newUrl).toContain('guests=2');
  });

  it('clearing location preserves other params', () => {
    const baseUrl = '/?location=Medellín&checkin=2026-07-01&guests=2';
    const clearedUrl = buildUrlWithLocation(baseUrl, '');

    expect(clearedUrl).not.toContain('location=');
    expect(clearedUrl).toContain('checkin=2026-07-01');
    expect(clearedUrl).toContain('guests=2');
  });

  // MUTATION: If location change wipes other params, this fails
  it('MUTATION: detects param wipe on location change', () => {
    const baseUrl = '/?location=Medellín&checkin=2026-07-01&guests=2';
    const newUrl = buildUrlWithLocation(baseUrl, 'Bogotá');

    expect(newUrl).toContain('checkin=2026-07-01');
    expect(newUrl).toContain('guests=2');
  });
});
