import { describe, it, expect } from 'vitest';
import { getMapPriorityUrl } from '@/lib/map-resolver';

describe('map-resolver', () => {
  it('should return iframe type when googleMapsUrl is present', () => {
    const result = getMapPriorityUrl({
      name: 'Test Hotel',
      googleMapsUrl: 'https://www.google.com/maps/embed?pb=...',
      address: 'Calle Falsa 123',
    });

    expect(result.type).toBe('iframe');
    expect(result.url).toContain('embed');
  });

  it('should return leaflet type when coordinates are present', () => {
    const result = getMapPriorityUrl({
      name: 'Test Hotel',
      latitude: 4.6,
      longitude: -74.0,
    });

    expect(result.type).toBe('leaflet');
    expect(result.label).toBe('4.6,-74');
  });

  it('should return link type with address when no coordinates or url', () => {
    const result = getMapPriorityUrl({
      name: 'Test Hotel',
      address: 'Carrera 11 # 9-21, Bogotá',
    });

    expect(result.type).toBe('link');
    expect(result.url).toContain('Carrera');
    expect(result.url).toContain('google.com/maps/search');
  });

  it('should return link type with hotel name as last resort', () => {
    const result = getMapPriorityUrl({
      name: 'Hotel La Ramada',
    });

    expect(result.type).toBe('link');
    expect(result.url).toContain('Hotel');
  });

  it('should return none type when no data is available', () => {
    const result = getMapPriorityUrl({
      name: '',
    });

    expect(result.type).toBe('none');
  });

  it('should prioritize googleMapsUrl over coordinates', () => {
    const result = getMapPriorityUrl({
      name: 'Test Hotel',
      googleMapsUrl: 'https://maps.google.com/embed',
      latitude: 10,
      longitude: 10,
    });

    expect(result.type).toBe('iframe');
  });

  it('should prioritize coordinates over address', () => {
    const result = getMapPriorityUrl({
      name: 'Test Hotel',
      latitude: 10,
      longitude: 10,
      address: 'Some Address',
    });

    expect(result.type).toBe('leaflet');
  });
});
