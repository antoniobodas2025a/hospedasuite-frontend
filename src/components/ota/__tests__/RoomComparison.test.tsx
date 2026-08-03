// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import RoomComparison from '@/components/ota/RoomComparison';

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
});
