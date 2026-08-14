// @vitest-environment jsdom
import '../bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import type { Hotel, Room } from '@/types';

function MotionMock(tag: keyof React.JSX.IntrinsicElements) {
  return function MockedMotion({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
    const rest = { ...props };
    ['initial', 'animate', 'exit', 'transition', 'layoutId', 'whileTap'].forEach((key) => {
      delete rest[key];
    });
    return React.createElement(tag, rest, children);
  };
}

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: MotionMock('div'),
    section: MotionMock('section'),
    button: MotionMock('button'),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/app/actions/bookings', () => ({
  createPendingBookingAction: vi.fn(),
}));

vi.mock('@/lib/payment-gateway', () => ({
  createGateway: vi.fn(() => ({
    getCheckoutUrl: vi.fn(() => 'https://checkout.wompi.co/p?test=true'),
  })),
}));

const priceBreakdownProps: Record<string, unknown> = {};
vi.mock('@/components/ota/PriceBreakdown', () => ({
  default: (props: Record<string, unknown>) => {
    Object.assign(priceBreakdownProps, props);
    return <div data-testid="price-breakdown-mock">PriceBreakdown</div>;
  },
}));

function makeHotel(overrides: Partial<Hotel> = {}): Hotel {
  return {
    id: 'hotel-1',
    name: 'Hotel Test',
    primary_color: '#0ea5e9',
    cancellation_policy: 'Flexible',
    tax_rate: 0.19,
    tax_regime: 'responsible',
    ...overrides,
  };
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    hotel_id: 'hotel-1',
    name: 'Suite Test',
    price: 100000,
    status: 'active',
    ...overrides,
  };
}

describe('CheckoutForm', () => {
  beforeEach(() => {
    Object.keys(priceBreakdownProps).forEach((key) => delete priceBreakdownProps[key]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('displays grandTotal equal to basePrice with no tax added', () => {
    const { getByText } = render(
      <CheckoutForm
        hotel={makeHotel()}
        room={makeRoom()}
        checkIn="2026-08-14"
        checkOut="2026-08-17"
        nights={3}
        basePrice={300000}
        isOta={false}
      />
    );

    // Mobile summary bar shows the final amount the guest pays
    expect(getByText(/300[.,]000/)).toBeInTheDocument();
  });

  it('does not pass taxRate prop to PriceBreakdown', () => {
    render(
      <CheckoutForm
        hotel={makeHotel()}
        room={makeRoom()}
        checkIn="2026-08-14"
        checkOut="2026-08-17"
        nights={3}
        basePrice={300000}
        isOta={false}
      />
    );

    expect(priceBreakdownProps).toMatchObject({
      pricePerNight: 100000,
      nights: 3,
    });
    expect(priceBreakdownProps).not.toHaveProperty('taxRate');
  });

  it('renders PriceBreakdown with per-night price derived from basePrice and nights', () => {
    render(
      <CheckoutForm
        hotel={makeHotel()}
        room={makeRoom()}
        checkIn="2026-08-14"
        checkOut="2026-08-17"
        nights={5}
        basePrice={500000}
        isOta={false}
      />
    );

    expect(priceBreakdownProps.pricePerNight).toBe(100000);
    expect(priceBreakdownProps.nights).toBe(5);
  });

  it('keeps total unchanged regardless of hotel tax_rate (FLAT model)', () => {
    const { getByText } = render(
      <CheckoutForm
        hotel={makeHotel({ tax_rate: 0.19, tax_regime: 'responsible' })}
        room={makeRoom()}
        checkIn="2026-08-14"
        checkOut="2026-08-17"
        nights={2}
        basePrice={200000}
        isOta={false}
      />
    );

    expect(getByText(/200[.,]000/)).toBeInTheDocument();
    expect(priceBreakdownProps).not.toHaveProperty('taxRate');
  });
});
