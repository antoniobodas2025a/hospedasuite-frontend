/**
 * Unit tests for geocoding service — precision inference and error handling.
 *
 * Provider calls (Mapbox/Nominatim) are NOT tested here — those are
 * integration tests that require network or mocks.
 */
import { describe, it, expect, vi } from 'vitest';

// server-only is a Next.js marker — not available in test environment
vi.mock('server-only', () => ({}));

import { inferPrecision, GeocodeError } from '@/lib/geocoding-service';

describe('inferPrecision', () => {
  it('returns rooftop for address with street number', () => {
    expect(inferPrecision('Calle 10 #20-30', 'Medellín')).toBe('rooftop');
    expect(inferPrecision('123 Main Street', 'Bogotá')).toBe('rooftop');
    expect(inferPrecision('Av 5 #10-20, Provenza', 'Bogotá')).toBe('rooftop');
  });

  it('returns street for address without number but >5 chars', () => {
    expect(inferPrecision('Avenida Siempre Viva', 'Medellín')).toBe('street');
    expect(inferPrecision('Calle del Sol', 'Bogotá')).toBe('street');
  });

  it('returns city for empty or short address with city', () => {
    expect(inferPrecision('', 'Medellín')).toBe('city');
    expect(inferPrecision('a', 'Bogotá')).toBe('city');
  });

  it('returns none for empty address and city', () => {
    expect(inferPrecision('', '')).toBe('none');
    expect(inferPrecision('', '')).toBe('none');
  });
});

describe('GeocodeError', () => {
  it('carries code and message', () => {
    const err = new GeocodeError('Falló', 'GEOCODE_FAILED');
    expect(err.message).toBe('Falló');
    expect(err.code).toBe('GEOCODE_FAILED');
    expect(err.name).toBe('GeocodeError');
  });
});
