// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import RoomsListWithFilters from '@/components/ota/RoomsListWithFilters';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockVirtualizer = {
  getVirtualItems: vi.fn(() => []),
  getTotalSize: vi.fn(() => 0),
  measureElement: vi.fn(),
};

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(() => mockVirtualizer),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      style,
      variants,
      transition,
      layout,
      layoutId,
      ...props
    }: {
      children?: React.ReactNode;
      className?: string;
      style?: React.CSSProperties;
      variants?: Record<string, unknown>;
      transition?: Record<string, unknown>;
      layout?: boolean;
      layoutId?: string;
      [key: string]: unknown;
    }) =>
      React.createElement('div', {
        className,
        style,
        ...props,
        'data-variants': variants ? JSON.stringify(variants) : undefined,
        'data-transition': transition ? JSON.stringify(transition) : undefined,
        'data-layout': layout ? 'true' : undefined,
      }, children),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, {}, children),
}));

vi.mock('@/components/ota/RoomComparison', () => ({
  default: () => React.createElement('div', { 'data-testid': 'room-comparison' }, 'Comparison'),
}));

vi.mock('@/components/ota/RoomCard', () => ({
  default: ({ room }: { room: { id: string; name: string } }) => React.createElement('div', { 'data-testid': `room-card-${room.id}` }, room.name),
}));

const rooms = [
  { id: 'room-1', name: 'Room 1', price: 100000, status: 'active' },
  { id: 'room-2', name: 'Room 2', price: 120000, status: 'active' },
];

const manyRooms = Array.from({ length: 12 }, (_, i) => ({
  id: `room-${i + 1}`,
  name: `Room ${i + 1}`,
  price: 100000 + i * 10000,
  status: 'active',
}));

describe('RoomsListWithFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVirtualizer.getVirtualItems.mockReturnValue([]);
    mockVirtualizer.getTotalSize.mockReturnValue(0);
  });
  it('does not apply CSS animate-fade-in-up class to animated items', () => {
    const { container } = render(
      <RoomsListWithFilters
        rooms={rooms}
        availableRooms={rooms}
        slug="hotel-test"
        isSearchingDates={false}
      />
    );

    const animatedItems = container.querySelectorAll('[class*="animate-fade-in-up"]');
    expect(animatedItems.length).toBe(0);
  });

  it('does not set inline animation-delay on animated items', () => {
    const { container } = render(
      <RoomsListWithFilters
        rooms={rooms}
        availableRooms={rooms}
        slug="hotel-test"
        isSearchingDates={false}
      />
    );

    const withDelay = container.querySelectorAll('[style*="animationDelay"]');
    expect(withDelay.length).toBe(0);
  });

  it('staggers room card animations with a 50ms delay', () => {
    const { container } = render(
      <RoomsListWithFilters
        rooms={rooms}
        availableRooms={rooms}
        slug="hotel-test"
        isSearchingDates={false}
      />
    );

    const animatedItems = container.querySelectorAll('[data-variants]');
    const parent = Array.from(animatedItems).find((el) => {
      const parsed = JSON.parse(el.getAttribute('data-variants') || '{}');
      return parsed?.visible?.transition?.staggerChildren !== undefined;
    });

    expect(parent).toBeTruthy();
    const parsed = JSON.parse(parent?.getAttribute('data-variants') || '{}');
    expect(parsed.visible.transition.staggerChildren).toBe(0.05);
  });

  it('does not pass layout prop to animated room card items', () => {
    const { container } = render(
      <RoomsListWithFilters
        rooms={rooms}
        availableRooms={rooms}
        slug="hotel-test"
        isSearchingDates={false}
      />
    );

    const items = container.querySelectorAll('[data-layout]');
    expect(items.length).toBe(0);
  });

  it('uses virtualization when there are 10 or more rooms', () => {
    const virtualItems = manyRooms.slice(0, 5).map((room, i) => ({
      index: i,
      key: room.id,
      start: i * 300,
      end: (i + 1) * 300,
      size: 300,
    }));
    mockVirtualizer.getVirtualItems.mockReturnValue(virtualItems);
    mockVirtualizer.getTotalSize.mockReturnValue(3600);

    const { container } = render(
      <RoomsListWithFilters
        rooms={manyRooms}
        availableRooms={manyRooms}
        slug="hotel-test"
        isSearchingDates={false}
      />
    );

    expect(container.querySelector('[data-testid="virtual-list"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid^="virtual-item-"]').length).toBe(5);
  });

  it('does not use virtualization when there are fewer than 10 rooms', () => {
    const { container } = render(
      <RoomsListWithFilters
        rooms={rooms}
        availableRooms={rooms}
        slug="hotel-test"
        isSearchingDates={false}
      />
    );

    expect(container.querySelector('[data-testid="virtual-list"]')).not.toBeInTheDocument();
  });
});
