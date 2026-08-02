// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import RoomComparisonContent from '@/components/ota/RoomComparisonContent';

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
  {
    id: 'room-1',
    name: 'Suite A',
    price: 100000,
    price_per_night: 100000,
    capacity: 2,
    beds: 1,
    bed_type: 'double',
    amenities: ['wifi'],
    size_sqm: 20,
  },
  {
    id: 'room-2',
    name: 'Suite B',
    price: 120000,
    price_per_night: 120000,
    capacity: 4,
    beds: 2,
    bed_type: 'twin',
    amenities: ['wifi', 'ac'],
    size_sqm: 30,
  },
  {
    id: 'room-3',
    name: 'Suite C',
    price: 150000,
    price_per_night: 150000,
    capacity: 2,
    beds: 1,
    bed_type: 'queen',
    amenities: ['ac'],
    size_sqm: undefined,
  },
  {
    id: 'room-4',
    name: 'Suite D',
    price: 180000,
    price_per_night: 180000,
    capacity: 6,
    beds: 3,
    bed_type: 'bunk',
    amenities: [],
    size_sqm: 40,
  },
];

describe('RoomComparisonContent', () => {
  it('does not render when fewer than 4 rooms are provided', () => {
    const { container } = render(<RoomComparisonContent rooms={rooms.slice(0, 3)} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a toggle button with the room count', () => {
    const { getByRole } = render(<RoomComparisonContent rooms={rooms} />);
    expect(getByRole('button')).toHaveTextContent('Compare 4 rooms');
  });

  it('shows the comparison table after toggling open', () => {
    const { getByRole, getByText } = render(<RoomComparisonContent rooms={rooms} />);
    fireEvent.click(getByRole('button'));

    rooms.forEach((room) => {
      expect(getByText(room.name)).toBeInTheDocument();
      expect(getByText(`$${room.price_per_night.toLocaleString()} COP`)).toBeInTheDocument();
    });

    expect(getByText('Feature')).toBeInTheDocument();
    expect(getByText('Capacity')).toBeInTheDocument();
    expect(getByText('Beds')).toBeInTheDocument();
    expect(getByText('Size')).toBeInTheDocument();
  });

  it('renders capacity values for each room', () => {
    const { getByRole, getAllByText } = render(<RoomComparisonContent rooms={rooms} />);
    fireEvent.click(getByRole('button'));

    expect(getAllByText(/people/).length).toBe(rooms.length);
  });

  it('renders missing size as a dash', () => {
    const { getByRole, getAllByText } = render(<RoomComparisonContent rooms={rooms} />);
    fireEvent.click(getByRole('button'));

    expect(getAllByText('-').length).toBeGreaterThan(0);
  });
});
