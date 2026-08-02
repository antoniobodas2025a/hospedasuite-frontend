// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import React, { useState, useEffect } from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import RoomComparison from '@/components/ota/RoomComparison';
import RoomComparisonContent from '@/components/ota/RoomComparisonContent';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType<unknown> }>) => {
    function DynamicWrapper(props: Record<string, unknown>) {
      const [Loaded, setLoaded] = useState<React.ComponentType<unknown> | null>(null);
      useEffect(() => {
        loader().then((module) => setLoaded(() => module.default));
      }, []);

      if (!Loaded) {
        return (
          <div data-testid="room-comparison-skeleton">RoomComparisonSkeleton</div>
        );
      }
      return <Loaded {...props} />;
    }
    return DynamicWrapper;
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const messages: Record<string, string> = {
      'ota.comparison.compare': 'Compare {count} rooms',
      'ota.comparison.feature': 'Feature',
      'ota.comparison.capacity': 'Capacity',
      'ota.comparison.people': 'people',
      'ota.comparison.beds': 'Beds',
      'ota.comparison.size': 'Size',
    };
    let result = messages[key] ?? key;
    if (values) {
      Object.entries(values).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v));
      });
    }
    return result;
  },
}));

vi.mock('@/lib/amenity-registry', () => ({
  ROOM_AMENITY_REGISTRY: {
    wifi: { id: 'wifi', label: 'Wi-Fi' },
    ac: { id: 'ac', label: 'Air Conditioning' },
  },
}));

vi.mock('@/lib/room-helpers', () => ({
  formatBedType: (_type: string | undefined, count: number) => `${count} bed(s)`,
}));

const rooms = [
  { id: 'room-1', name: 'Suite A', price: 100000, price_per_night: 100000, capacity: 2, beds: 1, bed_type: 'double', amenities: ['wifi'], size_sqm: 20 },
  { id: 'room-2', name: 'Suite B', price: 120000, price_per_night: 120000, capacity: 4, beds: 2, bed_type: 'twin', amenities: ['wifi', 'ac'], size_sqm: 30 },
  { id: 'room-3', name: 'Suite C', price: 150000, price_per_night: 150000, capacity: 2, beds: 1, bed_type: 'queen', amenities: ['ac'], size_sqm: undefined },
  { id: 'room-4', name: 'Suite D', price: 180000, price_per_night: 180000, capacity: 6, beds: 3, bed_type: 'bunk', amenities: [], size_sqm: 40 },
];

describe('RoomComparison', () => {
  it('renders the loading skeleton while the comparison chunk is loading', () => {
    const { getByTestId } = render(<RoomComparison rooms={rooms} />);
    expect(getByTestId('room-comparison-skeleton')).toBeInTheDocument();
  });

  it('renders the comparison table after the chunk resolves and the user expands it', async () => {
    const { getAllByRole, getByText } = render(<RoomComparison rooms={rooms} />);
    await waitFor(() => {
      expect(getAllByRole('button').length).toBeGreaterThan(0);
    });
    fireEvent.click(getAllByRole('button')[0]);
    expect(getByText('Suite A')).toBeInTheDocument();
  });
});

