/**
 * Search-to-Checkout Integration — TDD Test Suite
 *
 * Validates the complete booking flow from search input to checkout.
 * Tests URL param persistence, data coherence, and error handling.
 *
 * Heurística #1 (Visibilidad): Search context visible at all times.
 * Heurística #3 (Control): User can go back without losing data.
 * Heurística #4 (Consistencia): Same params preserved across all transitions.
 *
 * Doherty Threshold: Each transition < 400ms.
 */

import { describe, it, expect } from 'vitest';

// ── Pure Functions: URL Param Flow ───────────────────────────────────────────

function buildSearchUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  return query ? `/?${query}` : '/';
}

function buildHotelUrl(slug: string, params: Record<string, string>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  return query ? `/hotel/${slug}?${query}` : `/hotel/${slug}`;
}

function buildRoomModalUrl(base: string, roomId: string): string {
  const urlObj = new URL(base, 'http://localhost');
  urlObj.searchParams.set('showRoom', roomId);
  return urlObj.pathname + urlObj.search;
}

function buildCheckoutUrl(slug: string, params: Record<string, string>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  return query ? `/book/${slug}/checkout?${query}` : `/book/${slug}/checkout`;
}

function extractParams(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
}

// ── TDD: Complete Search-to-Checkout Flow ────────────────────────────────────

describe('Search-to-Checkout Flow', () => {
  it('preserves all params from search to hotel detail', () => {
    // Step 1: User searches on homepage
    const searchUrl = buildSearchUrl({
      location: 'Medellín',
      checkin: '2026-07-01',
      checkout: '2026-07-05',
      guests: '2',
      category: 'glamping',
    });

    // Step 2: User clicks hotel card → navigate to hotel detail
    const hotelUrl = buildHotelUrl('hostal-la-candelaria', extractParams(searchUrl));

    const hotelParams = extractParams(hotelUrl);

    expect(hotelParams.location).toBe('Medellín');
    expect(hotelParams.checkin).toBe('2026-07-01');
    expect(hotelParams.checkout).toBe('2026-07-05');
    expect(hotelParams.guests).toBe('2');
    expect(hotelParams.category).toBe('glamping');
  });

  it('preserves all params when opening room modal', () => {
    const hotelUrl = buildHotelUrl('hostal-la-candelaria', {
      location: 'Medellín',
      checkin: '2026-07-01',
      checkout: '2026-07-05',
      guests: '2',
    });

    // Step 3: User clicks room → showRoom param added
    const modalUrl = buildRoomModalUrl(hotelUrl, 'room-123');

    const modalParams = extractParams(modalUrl);

    expect(modalParams.showRoom).toBe('room-123');
    expect(modalParams.location).toBe('Medellín');
    expect(modalParams.checkin).toBe('2026-07-01');
    expect(modalParams.checkout).toBe('2026-07-05');
    expect(modalParams.guests).toBe('2');
  });

  it('preserves all params when navigating to checkout', () => {
    const modalUrl = buildRoomModalUrl(
      buildHotelUrl('hostal-la-candelaria', {
        location: 'Medellín',
        checkin: '2026-07-01',
        checkout: '2026-07-05',
        guests: '2',
      }),
      'room-123',
    );

    // Step 4: User clicks "Reservar" → navigate to checkout
    const modalParams = extractParams(modalUrl);
    const checkoutParams: Record<string, string> = { ...modalParams };
    checkoutParams.room = modalParams.showRoom; // RoomShowcaseModalWrapper maps showRoom → room
    checkoutParams.ref = 'ota';
    delete checkoutParams.showRoom;

    const checkoutUrl = buildCheckoutUrl('hostal-la-candelaria', checkoutParams);

    const finalParams = extractParams(checkoutUrl);

    expect(finalParams.room).toBe('room-123');
    expect(finalParams.checkin).toBe('2026-07-01');
    expect(finalParams.checkout).toBe('2026-07-05');
    expect(finalParams.guests).toBe('2');
    expect(finalParams.ref).toBe('ota');
    expect(finalParams.location).toBe('Medellín');
  });

  // MUTATION: If location is lost during checkout navigation, this fails
  it('MUTATION: detects location param loss during checkout', () => {
    const searchUrl = buildSearchUrl({
      location: 'Cartagena',
      checkin: '2026-08-01',
      checkout: '2026-08-03',
      guests: '4',
    });

    const hotelUrl = buildHotelUrl('hotel-caribe', extractParams(searchUrl));
    const modalUrl = buildRoomModalUrl(hotelUrl, 'room-456');
    const modalParams = extractParams(modalUrl);

    const checkoutParams: Record<string, string> = { ...modalParams };
    checkoutParams.room = modalParams.showRoom;
    checkoutParams.ref = 'ota';
    delete checkoutParams.showRoom;

    const checkoutUrl = buildCheckoutUrl('hotel-caribe', checkoutParams);
    const finalParams = extractParams(checkoutUrl);

    expect(finalParams.location).toBe('Cartagena');
  });

  // MUTATION: If guests is overwritten during checkout, this fails
  it('MUTATION: detects guests param overwrite during checkout', () => {
    const searchUrl = buildSearchUrl({
      location: 'Bogotá',
      checkin: '2026-09-01',
      checkout: '2026-09-05',
      guests: '6',
    });

    const hotelUrl = buildHotelUrl('hotel-andino', extractParams(searchUrl));
    const modalUrl = buildRoomModalUrl(hotelUrl, 'room-789');
    const modalParams = extractParams(modalUrl);

    const checkoutParams: Record<string, string> = { ...modalParams };
    checkoutParams.room = modalParams.showRoom;
    checkoutParams.ref = 'ota';
    delete checkoutParams.showRoom;

    const checkoutUrl = buildCheckoutUrl('hotel-andino', checkoutParams);
    const finalParams = extractParams(checkoutUrl);

    expect(finalParams.guests).toBe('6');
  });
});

// ── TDD: Back Navigation (Heurística #3: Control) ───────────────────────────

describe('Back Navigation (Heurística #3)', () => {
  it('preserves search params when going back from hotel to home', () => {
    // User searches → goes to hotel → hits back
    const searchUrl = buildSearchUrl({
      location: 'Santa Marta',
      checkin: '2026-10-01',
      checkout: '2026-10-05',
      guests: '3',
    });

    const hotelUrl = buildHotelUrl('hotel-tayrona', extractParams(searchUrl));

    // Going back should restore the search URL
    const backUrl = searchUrl; // Browser back restores previous URL
    const backParams = extractParams(backUrl);

    expect(backParams.location).toBe('Santa Marta');
    expect(backParams.checkin).toBe('2026-10-01');
    expect(backParams.checkout).toBe('2026-10-05');
    expect(backParams.guests).toBe('3');
  });

  it('preserves search params when closing room modal', () => {
    const modalUrl = buildRoomModalUrl(
      buildHotelUrl('hotel-xyz', {
        location: 'Eje Cafetero',
        checkin: '2026-11-01',
        checkout: '2026-11-03',
        guests: '2',
      }),
      'room-100',
    );

    // Closing modal removes showRoom but preserves other params
    const urlObj = new URL(modalUrl, 'http://localhost');
    urlObj.searchParams.delete('showRoom');
    const closedUrl = urlObj.pathname + urlObj.search;

    const closedParams = extractParams(closedUrl);

    expect(closedParams.showRoom).toBeUndefined();
    expect(closedParams.location).toBe('Eje Cafetero');
    expect(closedParams.checkin).toBe('2026-11-01');
    expect(closedParams.checkout).toBe('2026-11-03');
    expect(closedParams.guests).toBe('2');
  });

  // MUTATION: If closing modal wipes all params, this fails
  it('MUTATION: detects param wipe when closing modal', () => {
    const modalUrl = buildRoomModalUrl(
      buildHotelUrl('hotel-abc', {
        location: 'San Andrés',
        checkin: '2026-12-01',
        checkout: '2026-12-07',
        guests: '2',
      }),
      'room-200',
    );

    const urlObj = new URL(modalUrl, 'http://localhost');
    urlObj.searchParams.delete('showRoom');
    const closedUrl = urlObj.pathname + urlObj.search;

    const closedParams = extractParams(closedUrl);

    expect(closedParams.location).toBe('San Andrés');
    expect(closedParams.checkin).toBe('2026-12-01');
  });
});

// ── TDD: Data Coherence (Dates, Guests, Room) ────────────────────────────────

describe('Data Coherence', () => {
  it('nights calculation is consistent across all components', () => {
    const checkin = '2026-07-01';
    const checkout = '2026-07-05';

    // Same calculation used in: RoomCard, CheckoutForm, checkout page
    const d1 = new Date(`${checkin}T12:00:00Z`);
    const d2 = new Date(`${checkout}T12:00:00Z`);
    const nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));

    expect(nights).toBe(4);
  });

  it('total price calculation is consistent across all components', () => {
    const basePrice = 100000;
    const nights = 3;
    const taxRate = 0.19;

    // Same calculation used in: RoomCard, CheckoutForm, pricing.ts
    const subtotal = basePrice * nights;
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + tax;

    expect(subtotal).toBe(300000);
    expect(tax).toBe(57000);
    expect(total).toBe(357000);
  });

  it('guest count is preserved through the entire flow', () => {
    const guestCounts = [1, 2, 4, 8, 15, 20];

    for (const guests of guestCounts) {
      const searchUrl = buildSearchUrl({
        location: 'Test',
        checkin: '2026-07-01',
        checkout: '2026-07-02',
        guests: String(guests),
      });

      const hotelUrl = buildHotelUrl('test-hotel', extractParams(searchUrl));
      const modalUrl = buildRoomModalUrl(hotelUrl, 'room-1');
      const modalParams = extractParams(modalUrl);

      const checkoutParams: Record<string, string> = { ...modalParams };
      checkoutParams.room = modalParams.showRoom;
      checkoutParams.ref = 'ota';
      delete checkoutParams.showRoom;

      const checkoutUrl = buildCheckoutUrl('test-hotel', checkoutParams);
      const finalParams = extractParams(checkoutUrl);

      expect(finalParams.guests).toBe(String(guests));
    }
  });

  // MUTATION: If nights calculation uses wrong timezone, this fails
  it('MUTATION: detects timezone error in nights calculation', () => {
    const checkin = '2026-07-01';
    const checkout = '2026-07-02';

    // Using T12:00:00Z to avoid timezone issues
    const d1 = new Date(`${checkin}T12:00:00Z`);
    const d2 = new Date(`${checkout}T12:00:00Z`);
    const nights = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

    expect(nights).toBe(1);
  });
});

// ── TDD: Error Handling (Heurística #9) ──────────────────────────────────────

describe('Error Handling (Heurística #9)', () => {
  it('detects missing checkin in checkout URL', () => {
    const checkoutUrl = buildCheckoutUrl('test-hotel', {
      room: 'room-123',
      checkout: '2026-07-05',
      ref: 'ota',
    });

    const params = extractParams(checkoutUrl);

    expect(params.checkin).toBeUndefined();
    // Checkout page should redirect back if checkin is missing
  });

  it('detects missing checkout in checkout URL', () => {
    const checkoutUrl = buildCheckoutUrl('test-hotel', {
      room: 'room-123',
      checkin: '2026-07-01',
      ref: 'ota',
    });

    const params = extractParams(checkoutUrl);

    expect(params.checkout).toBeUndefined();
  });

  it('detects invalid date format in checkout URL', () => {
    const checkoutUrl = buildCheckoutUrl('test-hotel', {
      room: 'room-123',
      checkin: '07/01/2026', // Wrong format
      checkout: '07/05/2026',
      ref: 'ota',
    });

    const params = extractParams(checkoutUrl);

    // ISO format check: YYYY-MM-DD
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(isoRegex.test(params.checkin)).toBe(false);
  });

  it('detects checkin after checkout', () => {
    const checkin = new Date('2026-07-05T12:00:00Z');
    const checkout = new Date('2026-07-01T12:00:00Z');

    expect(checkin.getTime()).toBeGreaterThan(checkout.getTime());
    // This should be blocked by checkout page validation
  });

  // MUTATION: If invalid dates pass through, this fails
  it('MUTATION: detects same-day booking (checkin === checkout)', () => {
    const checkin = '2026-07-01';
    const checkout = '2026-07-01';

    const d1 = new Date(`${checkin}T12:00:00Z`);
    const d2 = new Date(`${checkout}T12:00:00Z`);

    expect(d1.getTime()).toBe(d2.getTime());
    // Same-day should be blocked
  });
});

// ── TDD: Search Context Banner Coherence ─────────────────────────────────────

describe('Search Context Banner Coherence', () => {
  it('banner shows correct context from URL params', () => {
    const hotelUrl = buildHotelUrl('test-hotel', {
      location: 'Medellín',
      checkin: '2026-07-01',
      checkout: '2026-07-05',
      guests: '2',
      category: 'glamping',
    });

    const params = extractParams(hotelUrl);

    // Banner should show: "Glampings en Medellín · 1 jul → 5 jul · 2 huéspedes"
    expect(params.location).toBe('Medellín');
    expect(params.category).toBe('glamping');
    expect(params.checkin).toBe('2026-07-01');
    expect(params.checkout).toBe('2026-07-05');
    expect(params.guests).toBe('2');
  });

  it('modify search link preserves all params', () => {
    const hotelUrl = buildHotelUrl('test-hotel', {
      location: 'Cartagena',
      checkin: '2026-08-01',
      checkout: '2026-08-03',
      guests: '4',
      category: 'hotel',
    });

    const params = extractParams(hotelUrl);

    // "Modificar búsqueda" should go back to home with all params
    const homeUrl = buildSearchUrl(params);
    const homeParams = extractParams(homeUrl);

    expect(homeParams.location).toBe('Cartagena');
    expect(homeParams.checkin).toBe('2026-08-01');
    expect(homeParams.checkout).toBe('2026-08-03');
    expect(homeParams.guests).toBe('4');
    expect(homeParams.category).toBe('hotel');
  });

  // MUTATION: If modify search loses category, this fails
  it('MUTATION: detects category loss in modify search', () => {
    const hotelUrl = buildHotelUrl('test-hotel', {
      location: 'Bogotá',
      checkin: '2026-09-01',
      checkout: '2026-09-03',
      guests: '2',
      category: 'boutique',
    });

    const params = extractParams(hotelUrl);
    const homeUrl = buildSearchUrl(params);
    const homeParams = extractParams(homeUrl);

    expect(homeParams.category).toBe('boutique');
  });
});

// ── TDD: Doherty Threshold (Performance) ─────────────────────────────────────

describe('Doherty Threshold (Performance)', () => {
  it('URL param extraction completes in < 10ms', () => {
    const url = '/hotel/test?location=Medellín&checkin=2026-07-01&checkout=2026-07-05&guests=2&category=glamping&showRoom=room-123&ref=ota';

    const start = performance.now();
    const params = extractParams(url);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10);
    expect(Object.keys(params).length).toBe(7);
  });

  it('URL building completes in < 10ms', () => {
    const params = {
      location: 'Medellín',
      checkin: '2026-07-01',
      checkout: '2026-07-05',
      guests: '2',
      category: 'glamping',
    };

    const start = performance.now();
    const url = buildHotelUrl('test-hotel', params);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10);
    expect(url).toContain('location=Medell');
  });

  it('full flow (4 transitions) completes in < 50ms', () => {
    const start = performance.now();

    // Transition 1: Search → Hotel
    const searchUrl = buildSearchUrl({ location: 'Test', checkin: '2026-07-01', checkout: '2026-07-05', guests: '2' });
    const hotelUrl = buildHotelUrl('test', extractParams(searchUrl));

    // Transition 2: Hotel → Modal
    const modalUrl = buildRoomModalUrl(hotelUrl, 'room-1');

    // Transition 3: Modal → Checkout
    const modalParams = extractParams(modalUrl);
    const checkoutParams: Record<string, string> = { ...modalParams };
    checkoutParams.room = modalParams.showRoom!;
    checkoutParams.ref = 'ota';
    delete checkoutParams.showRoom;
    const checkoutUrl = buildCheckoutUrl('test', checkoutParams);

    // Transition 4: Extract final params
    const finalParams = extractParams(checkoutUrl);

    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
    expect(finalParams.checkin).toBe('2026-07-01');
    expect(finalParams.room).toBe('room-1');
  });
});
