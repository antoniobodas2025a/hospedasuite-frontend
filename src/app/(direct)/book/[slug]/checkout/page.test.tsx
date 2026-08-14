// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const redirectMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error('notFound');
});

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}));

const CheckoutFormMock = (props: Record<string, unknown>) => {
  return React.createElement('div', { 'data-testid': 'checkout-form-mock' }, JSON.stringify(props));
};

vi.mock('@/components/checkout/CheckoutForm', () => ({
  default: CheckoutFormMock,
}));

function makeSupabaseClient(hotelOverrides: Record<string, unknown> = {}, roomOverrides: Record<string, unknown> = {}) {
  return {
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      builder.select = vi.fn(() => builder);
      builder.eq = vi.fn(() => builder);
      builder.single = vi.fn(() => {
        if (table === 'hotels') {
          return Promise.resolve({
            data: {
              id: 'hotel-1',
              name: 'Hotel Test',
              primary_color: '#0ea5e9',
              cancellation_policy: 'Flexible',
              location: 'Bogotá',
              main_image_url: null,
              tax_rate: 0.19,
              tax_regime: 'responsible',
              ...hotelOverrides,
            },
            error: null,
          });
        }
        if (table === 'rooms') {
          return Promise.resolve({
            data: {
              id: 'room-1',
              hotel_id: 'hotel-1',
              name: 'Suite Test',
              price: 100000,
              weekend_price: 120000,
              capacity: 2,
              status: 'active',
              description: 'Habitación de prueba',
              gallery: [],
              ...roomOverrides,
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });
      return builder;
    },
  };
}

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(makeSupabaseClient())),
}));

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes basePrice equal to pricing.total (FLAT model)', async () => {
    const { default: CheckoutPage } = await import('./page');

    const element = await CheckoutPage({
      params: Promise.resolve({ slug: 'hotel-test' }),
      searchParams: Promise.resolve({
        room: 'room-1',
        checkin: '2026-08-14',
        checkout: '2026-08-17',
      }),
    });

    const checkoutFormElement = findCheckoutForm(element);
    expect(checkoutFormElement).toBeTruthy();
    // 3 nights: Aug 14 (weekday), Aug 15 (weekend), Aug 16 (weekend)
    // 100.000 + 120.000 + 120.000 = 340.000
    expect(checkoutFormElement?.props.basePrice).toBe(340000);
  });

  it('calls buildRoomPricingBreakdown without taxRate', async () => {
    const pricingModule = await import('@/lib/pricing');
    const spy = vi.spyOn(pricingModule, 'buildRoomPricingBreakdown');

    const { default: CheckoutPage } = await import('./page');

    await CheckoutPage({
      params: Promise.resolve({ slug: 'hotel-test' }),
      searchParams: Promise.resolve({
        room: 'room-1',
        checkin: '2026-08-14',
        checkout: '2026-08-17',
      }),
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const args = spy.mock.calls[0][0];
    expect(args).toMatchObject({
      pricePerNight: 100000,
      weekendPrice: 120000,
      checkIn: expect.any(Date),
      checkOut: expect.any(Date),
    });
    expect(args).not.toHaveProperty('taxRate');

    spy.mockRestore();
  });

  it('redirects when dates are invalid or missing', async () => {
    const { default: CheckoutPage } = await import('./page');

    await CheckoutPage({
      params: Promise.resolve({ slug: 'hotel-test' }),
      searchParams: Promise.resolve({
        room: 'room-1',
      }),
    });

    expect(redirectMock).toHaveBeenCalledWith('/book/hotel-test');
  });
});

function findCheckoutForm(element: any): any {
  if (!element) return null;
  if (element.type === CheckoutFormMock) return element;

  const children = element.props?.children;
  if (!children) return null;

  const childArray = Array.isArray(children) ? children : [children];
  for (const child of childArray) {
    const found = findCheckoutForm(child);
    if (found) return found;
  }

  return null;
}
