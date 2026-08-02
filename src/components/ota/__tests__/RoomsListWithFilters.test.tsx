// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import RoomsListWithFilters from '@/components/ota/RoomsListWithFilters';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
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

describe('RoomsListWithFilters', () => {
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
});
