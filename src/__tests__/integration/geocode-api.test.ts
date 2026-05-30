/**
 * Integration tests for /api/geocode endpoint.
 *
 * Mocks the geocoding service to avoid external API calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the geocoding service before importing the route handler
const mockGeocodeAddress = vi.fn();
vi.mock('@/lib/geocoding-service', () => ({
  geocodeAddress: mockGeocodeAddress,
  GeocodeError: class GeocodeError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'GeocodeError';
    }
  },
  inferPrecision: vi.fn(),
}));

// server-only mock
vi.mock('server-only', () => ({}));

async function callPost(body: unknown): Promise<Response> {
  const { POST } = await import('@/app/api/geocode/route');
  const req = new Request('http://localhost:3000/api/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req as any);
}

describe('POST /api/geocode', () => {
  beforeEach(() => {
    mockGeocodeAddress.mockReset();
  });

  it('returns 200 with coordinates on success', async () => {
    mockGeocodeAddress.mockResolvedValue({
      lat: 6.2442,
      lng: -75.5812,
      precision: 'street',
      source: 'mapbox',
    });

    const res = await callPost({
      address: 'Calle 10 #20-30',
      city: 'Medellín',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      lat: 6.2442,
      lng: -75.5812,
      precision: 'street',
      source: 'mapbox',
    });
  });

  it('returns 422 when geocoding fails', async () => {
    const { GeocodeError } = await import('@/lib/geocoding-service');
    mockGeocodeAddress.mockRejectedValue(
      new GeocodeError('No se pudo determinar la ubicación', 'GEOCODE_FAILED'),
    );

    const res = await callPost({
      address: 'Calle Falsa 123',
      city: 'Ciudad Inexistente',
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('GEOCODE_FAILED');
  });

  it('returns 400 when address is missing', async () => {
    const res = await callPost({ city: 'Medellín' });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 when city is missing', async () => {
    const res = await callPost({ address: 'Calle 10' });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 for empty body', async () => {
    const res = await callPost({});

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('passes optional country parameter', async () => {
    mockGeocodeAddress.mockResolvedValue({
      lat: 4.711,
      lng: -74.0721,
      precision: 'rooftop',
      source: 'mapbox',
    });

    await callPost({
      address: 'Carrera 7 # 32-10',
      city: 'Bogotá',
      country: 'Colombia',
    });

    expect(mockGeocodeAddress).toHaveBeenCalledWith(
      'Carrera 7 # 32-10',
      'Bogotá',
      'Colombia',
    );
  });
});
