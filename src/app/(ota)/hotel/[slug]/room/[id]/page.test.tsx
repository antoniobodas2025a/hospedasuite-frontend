// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

class NotFoundError extends Error {}
const notFoundMock = vi.fn(() => {
  throw new NotFoundError();
});
const gatewayGetAvailabilityMock = vi.fn();
const roomDetailClientMock = vi.fn(() => null);

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(() => async (key: string) => key),
}));

vi.mock('@/app/actions/room-detail', () => ({
  getRoomDetailAction: vi.fn(),
}));

vi.mock('@/gateways/supabase-room-gateway', () => ({
  createRoomDetailGateway: vi.fn(() => ({
    getAvailability: gatewayGetAvailabilityMock,
  })),
}));

vi.mock('@/components/ota/room-detail/room-detail-client', () => ({
  RoomDetailClient: roomDetailClientMock,
}));

import { getRoomDetailAction } from '@/app/actions/room-detail';

describe('room detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeHotelContext(overrides: Record<string, unknown> = {}) {
    return {
      id: 'hotel-1',
      name: 'Hotel Mirador',
      slug: 'hotel-mirador',
      city: 'Bogotá',
      totalRooms: 2,
      subscriptionStatus: 'active',
      status: 'active',
      taxRate: 0.19,
      cancellationPolicy: 'Cancel up to 24h before',
      primaryColor: '#3b82f6',
      ...overrides,
    };
  }

  function makeRoom(overrides: Record<string, unknown> = {}) {
    return {
      id: 'room-1',
      name: 'Suite Mirador',
      description: 'Habitación con vista panorámica',
      capacity: 2,
      beds: 1,
      bedType: 'King',
      gallery: ['https://example.com/room-1.jpg'],
      amenities: ['wifi'],
      pricePerNight: 100000,
      weekendPrice: 150000,
      status: 'active',
      restricted: false,
      ...overrides,
    };
  }

  describe('generateMetadata', () => {
    it('returns unique SEO metadata for the room', async () => {
      (getRoomDetailAction as any).mockResolvedValue({
        success: true,
        data: { room: makeRoom(), hotel: makeHotelContext() },
      });

      const { generateMetadata } = await import('./page');
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'hotel-mirador', id: 'room-1' }),
        searchParams: Promise.resolve({}),
      });

      expect(await metadata.title).toBe('Suite Mirador — Hotel Mirador, Bogotá | HospedaSuite');
      expect(await metadata.description).toBe('Habitación con vista panorámica');
      expect(metadata.openGraph?.images).toEqual(['https://example.com/room-1.jpg']);
      expect(metadata.alternates?.canonical).toBe(
        'https://hospedasuite.com/hotel/hotel-mirador/room/room-1'
      );
    });

    it('returns fallback metadata when the room is missing', async () => {
      (getRoomDetailAction as any).mockResolvedValue({
        success: false,
      });

      const { generateMetadata } = await import('./page');
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'hotel-mirador', id: 'room-1' }),
        searchParams: Promise.resolve({}),
      });

      expect(await metadata.title).toBe('roomNotFound');
    });
  });

  describe('default page', () => {
    it('builds the view model and renders RoomDetailClient with output', async () => {
      (getRoomDetailAction as any).mockResolvedValue({
        success: true,
        data: { room: makeRoom(), hotel: makeHotelContext() },
      });
      gatewayGetAvailabilityMock.mockResolvedValue([]);

      const { default: Page } = await import('./page');
      const element = await Page({
        params: Promise.resolve({ slug: 'hotel-mirador', id: 'room-1' }),
        searchParams: Promise.resolve({}),
      });

      expect(element.type).toBe('main');
      const children = element.props.children;
      expect(children[1].type).toBe(roomDetailClientMock);
      const output = children[1].props.output;
      expect(output.roomName).toBe('Suite Mirador');
      expect(output.hotelName).toBe('Hotel Mirador');
      expect(output.hotelSlug).toBe('hotel-mirador');

      const jsonLd = findJsonLdScript(element);
      expect(jsonLd).toBeTruthy();
      const structured = JSON.parse(jsonLd!);
      expect(structured['@type']).toContain('HotelRoom');
      expect(structured.offers?.['@type']).toBe('Offer');
    });

    it('passes availability into the view model when dates are valid', async () => {
      (getRoomDetailAction as any).mockResolvedValue({
        success: true,
        data: { room: makeRoom(), hotel: makeHotelContext() },
      });
      gatewayGetAvailabilityMock.mockResolvedValue([
        { date: '2026-08-10', available: true, price: 100000 },
        { date: '2026-08-11', available: true, price: 100000 },
      ]);

      const { default: Page } = await import('./page');
      const element = await Page({
        params: Promise.resolve({ slug: 'hotel-mirador', id: 'room-1' }),
        searchParams: Promise.resolve({
          checkin: '2026-08-10',
          checkout: '2026-08-12',
          guests: '2',
        }),
      });

      const children = element.props.children;
      const output = children[1].props.output;
      expect(output.state).toBe('detail');
      expect(output.pricing).not.toBeNull();
      expect(output.pricing.total).toBeGreaterThan(0);
      expect(gatewayGetAvailabilityMock).toHaveBeenCalledWith('room-1', {
        from: expect.any(Date),
        to: expect.any(Date),
      });
    });

    it('calls notFound when the gateway cannot find the hotel or room', async () => {
      (getRoomDetailAction as any).mockResolvedValue({
        success: false,
      });

      const { default: Page } = await import('./page');
      await expect(
        Page({
          params: Promise.resolve({ slug: 'hotel-mirador', id: 'room-1' }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow(NotFoundError);

      expect(notFoundMock).toHaveBeenCalled();
    });

    it('calls notFound when the room is missing', async () => {
      (getRoomDetailAction as any).mockResolvedValue({
        success: false,
      });

      const { default: Page } = await import('./page');
      await expect(
        Page({
          params: Promise.resolve({ slug: 'hotel-mirador', id: 'room-1' }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow(NotFoundError);

      expect(notFoundMock).toHaveBeenCalled();
    });

    it('escapes closing HTML tags in JSON-LD to prevent XSS', async () => {
      (getRoomDetailAction as any).mockResolvedValue({
        success: true,
        data: {
          room: makeRoom({
            description: '</script><script>alert("xss")</script>',
          }),
          hotel: makeHotelContext(),
        },
      });

      const { default: Page } = await import('./page');
      const element = await Page({
        params: Promise.resolve({ slug: 'hotel-mirador', id: 'room-1' }),
        searchParams: Promise.resolve({}),
      });

      const jsonLd = findJsonLdScript(element);
      expect(jsonLd).toBeTruthy();
      expect(jsonLd).not.toContain('</script>');
      expect(jsonLd).toContain('<\\/script>');

      const structured = JSON.parse(jsonLd!);
      expect(structured.description).toContain('</script>');
    });
  });
});

function findJsonLdScript(element: any): string | null {
  const children = element?.props?.children;
  if (!children) return null;
  const all = Array.isArray(children) ? children : [children];
  for (const child of all) {
    if (child?.type === 'script' && child?.props?.type === 'application/ld+json') {
      return child.props?.dangerouslySetInnerHTML?.__html || child.props?.children || null;
    }
    if (child?.props?.children) {
      const nested = findJsonLdScript(child);
      if (nested) return nested;
    }
  }
  return null;
}
