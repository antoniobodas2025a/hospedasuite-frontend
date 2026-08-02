// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { RoomInfoPanel } from '../RoomInfoPanel';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      'ota.showcase.authorsPick': "Author's Pick",
      'ota.showcase.amenities': 'Amenities',
      'ota.showcase.premiumService': 'Premium service',
      'ota.showcase.bookingSummary': 'Booking Summary',
      'ota.showcase.stay': 'Stay',
      'ota.showcase.nights_one': 'night',
      'ota.showcase.nights_other': 'nights',
      'ota.showcase.occupancy': 'Occupancy',
      'ota.showcase.guest_one': 'guest',
      'ota.showcase.guest_other': 'guests',
      'ota.showcase.cancellationPolicy': 'Cancellation Policy',
      'ota.showcase.cancellationPolicyHelp': 'Cancel free up to 24h before check-in',
      'ota.showcase.paymentMethods': 'Payment methods',
      'ota.showcase.cards': 'Credit/debit cards',
      'ota.showcase.pse': 'PSE',
      'ota.showcase.nequi': 'Nequi',
      'ota.showcase.noPolicy': 'Check with the hotel',
    };
    return messages[key] ?? key;
  },
  useLocale: () => 'es',
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: () => '22 Jul',
}));

// Mock @/lib/date-locale
vi.mock('@/lib/date-locale', () => ({
  getDateFnsLocale: () => 'es',
}));

// Mock @/lib/amenity-registry
vi.mock('@/lib/amenity-registry', () => ({
  getRoomAmenityById: (id: string) => ({
    id,
    icon: () => null,
    label: 'WiFi',
    storyTitle: 'Fast Wi-Fi',
    storyDescription: 'High-speed internet',
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock @/components/ui/glass
vi.mock('@/components/ui/glass', () => ({
  GlassCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

// Mock PriceBreakdown
vi.mock('../PriceBreakdown', () => ({
  default: ({ pricePerNight, nights }: { pricePerNight: number; nights: number }) => (
    <div data-testid="price-breakdown">
      ${pricePerNight.toLocaleString()} × {nights} nights
    </div>
  ),
}));

const baseRoom = {
  id: 'room-1',
  name: 'Suite Deluxe',
  price_per_night: 150000,
  price: 150000,
  capacity: 4,
  amenities: ['wifi'],
};

const baseProps = {
  room: baseRoom,
  checkIn: '2026-07-22',
  checkOut: '2026-07-23',
  defaultGuests: 2,
  isOverCapacity: false,
  nights: 1,
  taxRate: 0.19,
  variant: 'desktop' as const,
  cancellationPolicy: 'Cancel free up to 24h before check-in',
};

describe('RoomInfoPanel', () => {
  it('displays the cancellation policy when provided', () => {
    const { getByText } = render(<RoomInfoPanel {...baseProps} />);
    expect(getByText('Cancellation Policy')).toBeTruthy();
    expect(getByText('Cancel free up to 24h before check-in')).toBeTruthy();
  });

  it('shows a fallback when no cancellation policy is provided', () => {
    const { getByText } = render(<RoomInfoPanel {...baseProps} cancellationPolicy={undefined} />);
    expect(getByText('Cancellation Policy')).toBeTruthy();
    expect(getByText('Check with the hotel')).toBeTruthy();
  });

  it('displays payment methods with accessible labels', () => {
    const { getByText, getByLabelText } = render(<RoomInfoPanel {...baseProps} />);
    expect(getByText('Payment methods')).toBeTruthy();
    expect(getByLabelText('Credit/debit cards')).toBeTruthy();
    expect(getByLabelText('PSE')).toBeTruthy();
    expect(getByLabelText('Nequi')).toBeTruthy();
  });

  it('renders cancellation policy help tooltip with accessible trigger', () => {
    const { getByLabelText } = render(<RoomInfoPanel {...baseProps} />);
    const helpTrigger = getByLabelText('Cancel free up to 24h before check-in');
    expect(helpTrigger).toBeTruthy();
    expect(helpTrigger.tagName).toBe('BUTTON');
  });
});
