// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import LocationCard from '../LocationCard';

describe('LocationCard', () => {
  const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    // Reset mocks
  });

  afterEach(() => {
    cleanup();
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    }
  });

  describe('Static Map Display (API key available)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-api-key-123';
    });

    it('renders a static map image when API key and coordinates are available', () => {
      const { getByRole } = render(
        <LocationCard
          hotelName="Hotel Test"
          latitude={40.4168}
          longitude={-3.7038}
          address="Calle Falsa 123"
        />
      );

      const img = getByRole('img');
      expect(img).toBeDefined();
      expect(img.getAttribute('src')).toContain('maps.googleapis.com/maps/api/staticmap');
      expect(img.getAttribute('src')).toContain('40.4168');
      expect(img.getAttribute('src')).toContain('-3.7038');
      expect(img.getAttribute('src')).toContain('test-api-key-123');
    });

    it('includes descriptive alt text with hotel name', () => {
      const { getByRole } = render(
        <LocationCard
          hotelName="Hotel Plaza"
          latitude={40.4168}
          longitude={-3.7038}
        />
      );

      const img = getByRole('img');
      expect(img.getAttribute('alt')).toContain('Hotel Plaza');
    });

    it('sets lazy loading on the image', () => {
      const { getByRole } = render(
        <LocationCard
          hotelName="Hotel Test"
          latitude={40.4168}
          longitude={-3.7038}
        />
      );

      const img = getByRole('img');
      expect(img.getAttribute('loading')).toBe('lazy');
    });
  });

  describe('Textual Fallback (no API key)', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    });

    it('renders textual card when API key is not configured', () => {
      const { queryByRole, getByText } = render(
        <LocationCard
          hotelName="Hotel Test"
          address="Calle Falsa 123, Madrid"
          latitude={40.4168}
          longitude={-3.7038}
        />
      );

      // Should NOT render an img
      const img = queryByRole('img');
      expect(img).toBeNull();

      // Should render the address
      expect(getByText('Calle Falsa 123, Madrid')).toBeDefined();
    });

    it('renders nearby points when provided', () => {
      const nearbyPoints = [
        { name: 'Plaza Mayor', distance: '5 min walk' },
        { name: 'Museo del Prado', distance: '10 min walk' },
      ];

      const { getByText } = render(
        <LocationCard
          hotelName="Hotel Test"
          address="Calle Falsa 123"
          nearbyPoints={nearbyPoints}
        />
      );

      expect(getByText('Plaza Mayor')).toBeDefined();
      expect(getByText('5 min walk')).toBeDefined();
      expect(getByText('Museo del Prado')).toBeDefined();
      expect(getByText('10 min walk')).toBeDefined();
    });

    it('falls back to textual card when coordinates are missing even with API key', () => {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';

      const { queryByRole, getByText } = render(
        <LocationCard
          hotelName="Hotel Test"
          address="Calle Falsa 123"
        />
      );

      const img = queryByRole('img');
      expect(img).toBeNull();
      expect(getByText('Calle Falsa 123')).toBeDefined();
    });
  });

  describe('View on Google Maps Button', () => {
    it('opens Google Maps in new tab with coordinates when available', () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      const { getByRole } = render(
        <LocationCard
          hotelName="Hotel Test"
          latitude={40.4168}
          longitude={-3.7038}
          address="Calle Falsa 123"
        />
      );

      const button = getByRole('link', { name: /ver ubicación en google maps/i });
      expect(button).toBeDefined();
      expect(button.getAttribute('href')).toContain('google.com/maps');
      expect(button.getAttribute('href')).toContain('40.4168');
      expect(button.getAttribute('href')).toContain('-3.7038');
      expect(button.getAttribute('target')).toBe('_blank');
      expect(button.getAttribute('rel')).toContain('noopener');
      expect(button.getAttribute('rel')).toContain('noreferrer');
    });

    it('uses address for Google Maps URL when coordinates are not available', () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      const { getByRole } = render(
        <LocationCard
          hotelName="Hotel Test"
          address="Calle Falsa 123, Madrid"
        />
      );

      const button = getByRole('link', { name: /ver ubicación en google maps/i });
      const href = button.getAttribute('href') || '';
      expect(href).toContain('google.com/maps');
      expect(href).toContain(encodeURIComponent('Calle Falsa 123, Madrid'));
    });

    it('uses hotel name as last resort for Google Maps URL', () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      const { getByRole } = render(
        <LocationCard
          hotelName="Hotel Plaza"
        />
      );

      const button = getByRole('link', { name: /ver ubicación en google maps/i });
      const href = button.getAttribute('href') || '';
      expect(href).toContain('google.com/maps');
      expect(href).toContain(encodeURIComponent('Hotel Plaza'));
    });

    it('has accessible aria-label', () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      const { getByRole } = render(
        <LocationCard
          hotelName="Hotel Test"
          latitude={40.4168}
          longitude={-3.7038}
        />
      );

      const button = getByRole('link', { name: /ver ubicación en google maps/i });
      expect(button.getAttribute('aria-label')).toBeDefined();
    });
  });

  describe('Responsive Design', () => {
    it('has responsive width classes on the container', () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      const { container } = render(
        <LocationCard
          hotelName="Hotel Test"
          address="Calle Falsa 123"
          latitude={40.4168}
          longitude={-3.7038}
        />
      );

      const wrapper = container.firstElementChild;
      expect(wrapper).toBeDefined();
      expect(wrapper?.className).toContain('w-full');
    });

    it('has max-width constraint for desktop', () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      const { container } = render(
        <LocationCard
          hotelName="Hotel Test"
          address="Calle Falsa 123"
          latitude={40.4168}
          longitude={-3.7038}
        />
      );

      const wrapper = container.firstElementChild;
      expect(wrapper).toBeDefined();
      const className = wrapper?.className || '';
      const hasMaxWidth = className.includes('max-w-');
      expect(hasMaxWidth).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('renders without crashing when no data is provided', () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      const { container } = render(
        <LocationCard hotelName="Hotel Test" />
      );

      expect(container.firstElementChild).toBeDefined();
    });

    it('renders with null coordinates', () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      const { container, getByText } = render(
        <LocationCard
          hotelName="Hotel Test"
          address="Calle Falsa 123"
          latitude={null}
          longitude={null}
        />
      );

      expect(container.firstElementChild).toBeDefined();
      expect(getByText('Calle Falsa 123')).toBeDefined();
    });
  });
});
