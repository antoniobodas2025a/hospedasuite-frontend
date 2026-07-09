// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, afterEach, mock } from 'bun:test';
import React from 'react';
import { render, cleanup } from '@testing-library/react';

// Mock next-intl before importing the component
const mockTranslations: Record<string, string> = {
  'ota.hotelInfo.locationDetails': 'Location Details',
  'ota.hotelInfo.schedules': 'Schedules',
  'ota.hotelInfo.checkin': 'Check-in',
  'ota.hotelInfo.checkout': 'Check-out',
  'ota.hotelInfo.reception': 'Reception',
  'ota.hotelInfo.cancellationPolicy': 'Cancellation Policy',
  'ota.hotelInfo.defaultCancellationPolicy': 'Free cancellation up to 24h before check-in.',
  'ota.hotelInfo.address': 'Address',
  'ota.hotelInfo.contact': 'Contact',
};

// Use Bun's mock.module to mock next-intl
mock.module('next-intl', () => ({
  useTranslations: () => (key: string) => mockTranslations[key] || key,
}));

// Import after mocking
import HotelInfoSection from '../HotelInfoSection';

describe('HotelInfoSection Integration', () => {
  const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  afterEach(() => {
    cleanup();
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    }
  });

  it('renders LocationCard with hotel data', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const { getByText } = render(
      <HotelInfoSection
        hotelName="Hotel Plaza"
        location="Madrid, Spain"
        address="Calle Gran Vía 123"
        latitude={40.4168}
        longitude={-3.7038}
      />
    );

    // LocationCard should render the address (textual fallback since no API key)
    expect(getByText('Calle Gran Vía 123')).toBeDefined();
  });

  it('passes correct props to LocationCard', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const { getByRole } = render(
      <HotelInfoSection
        hotelName="Hotel Plaza"
        address="Calle Gran Vía 123"
        latitude={40.4168}
        longitude={-3.7038}
      />
    );

    // The Google Maps link should contain the coordinates
    const mapsLink = getByRole('link', { name: /ver ubicación en google maps/i });
    expect(mapsLink.getAttribute('href')).toContain('40.4168');
    expect(mapsLink.getAttribute('href')).toContain('-3.7038');
  });

  it('renders location zone information', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const { getByText } = render(
      <HotelInfoSection
        hotelName="Hotel Plaza"
        location="Madrid, Spain"
        address="Calle Gran Vía 123"
      />
    );

    expect(getByText('Madrid, Spain')).toBeDefined();
  });

  it('renders schedules section', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const { getByText } = render(
      <HotelInfoSection
        hotelName="Hotel Plaza"
        checkInTime="14:00"
        checkOutTime="12:00"
      />
    );

    expect(getByText('14:00')).toBeDefined();
    expect(getByText('12:00')).toBeDefined();
  });

  it('renders cancellation policy when provided', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const { getByText } = render(
      <HotelInfoSection
        hotelName="Hotel Plaza"
        cancellationPolicy="Free cancellation up to 48h before check-in."
      />
    );

    expect(getByText('Free cancellation up to 48h before check-in.')).toBeDefined();
  });

  it('does NOT import or use React-Leaflet', () => {
    // This test verifies by checking that the component renders without
    // any Leaflet-specific DOM elements (like .leaflet-container)
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const { container } = render(
      <HotelInfoSection
        hotelName="Hotel Plaza"
        latitude={40.4168}
        longitude={-3.7038}
      />
    );

    // No leaflet container should exist
    const leafletContainer = container.querySelector('.leaflet-container');
    expect(leafletContainer).toBeNull();
  });
});
