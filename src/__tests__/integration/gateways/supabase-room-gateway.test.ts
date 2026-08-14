import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseRoomGateway } from '@/gateways/supabase-room-gateway';
import { isTemporalCollision } from '@/lib/booking-helpers';

function createMockSupabase() {
  const queue: Array<{ data: any; error: any }> = [];
  const next = () => queue.shift() ?? { data: null, error: null };
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    single: vi.fn(() => builder),
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(next()).then(onFulfilled, onRejected),
  };
  return {
    queue,
    from: vi.fn(() => builder),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    builder,
  };
}

function mockRoom(overrides: any = {}) {
  return {
    id: 'room-1',
    hotel_id: 'hotel-1',
    name: 'Suite',
    description: 'A nice suite',
    capacity: 2,
    beds: 1,
    bed_type: 'Queen',
    price: 100,
    base_price: 100,
    price_base: 100,
    weekend_price: 150,
    status: 'active',
    gallery: ['https://example.com/img1.jpg'],
    amenities: ['WiFi', 'AC'],
    ...overrides,
  };
}

function mockHotel(overrides: any = {}) {
  return {
    id: 'hotel-1',
    name: 'Mirador',
    slug: 'mirador',
    status: 'active',
    subscription_status: 'active',
    go_live: true,
    tax_rate: 0.19,
    cancellation_policy: 'Flexible',
    primary_color: '#3b82f6',
    city: 'Bogotá',
    location: 'Bogotá',
    ...overrides,
  };
}

describe('SupabaseRoomGateway', () => {
  describe('getRoomDetail', () => {
    it('returns a room when the hotel is active and subscription is active', async () => {
      const mock = createMockSupabase();
      mock.queue.push({ data: mockHotel(), error: null });
      mock.queue.push({ data: mockRoom(), error: null });
      mock.queue.push({ data: null, error: null, count: 2 });

      const gateway = new SupabaseRoomGateway(mock as unknown as SupabaseClient);
      const result = await gateway.getRoomDetail('mirador', 'room-1');

      expect(result).not.toBeNull();
      expect(result?.room.id).toBe('room-1');
      expect(result?.room.name).toBe('Suite');
      expect(result?.room.restricted).toBe(false);
      expect(result?.room.pricePerNight).toBe(100);
      expect(result?.room.weekendPrice).toBe(150);
      expect(result?.room.gallery).toEqual(['https://example.com/img1.jpg']);
      expect(result?.room.amenities).toEqual(['WiFi', 'AC']);
      expect(result?.hotel.slug).toBe('mirador');
    });

    it('returns null when the hotel subscription is cancelled', async () => {
      const mock = createMockSupabase();
      mock.queue.push({ data: mockHotel({ subscription_status: 'cancelled' }), error: null });

      const gateway = new SupabaseRoomGateway(mock as unknown as SupabaseClient);
      const room = await gateway.getRoomDetail('mirador', 'room-1');

      expect(room).toBeNull();
    });

    it('returns the room with restricted flag when the subscription is past_due', async () => {
      const mock = createMockSupabase();
      mock.queue.push({ data: mockHotel({ subscription_status: 'past_due' }), error: null });
      mock.queue.push({ data: mockRoom(), error: null });
      mock.queue.push({ data: null, error: null, count: 2 });

      const gateway = new SupabaseRoomGateway(mock as unknown as SupabaseClient);
      const result = await gateway.getRoomDetail('mirador', 'room-1');

      expect(result).not.toBeNull();
      expect(result?.room.restricted).toBe(true);
    });

    it('uses the stored weekend_price when present', async () => {
      const mock = createMockSupabase();
      mock.queue.push({ data: mockHotel(), error: null });
      mock.queue.push({ data: mockRoom({ weekend_price: 175 }), error: null });
      mock.queue.push({ data: null, error: null, count: 2 });

      const gateway = new SupabaseRoomGateway(mock as unknown as SupabaseClient);
      const result = await gateway.getRoomDetail('mirador', 'room-1');

      expect(result?.room.weekendPrice).toBe(175);
    });

    it('falls back to price * 1.2 when weekend_price is not set', async () => {
      const mock = createMockSupabase();
      mock.queue.push({ data: mockHotel(), error: null });
      mock.queue.push({ data: mockRoom({ weekend_price: null }), error: null });
      mock.queue.push({ data: null, error: null, count: 2 });

      const gateway = new SupabaseRoomGateway(mock as unknown as SupabaseClient);
      const result = await gateway.getRoomDetail('mirador', 'room-1');

      expect(result?.room.weekendPrice).toBe(120);
    });

    it('normalizes weekend_price=0 to basePrice * 1.2', async () => {
      const mock = createMockSupabase();
      mock.queue.push({ data: mockHotel(), error: null });
      mock.queue.push({ data: mockRoom({ weekend_price: 0 }), error: null });
      mock.queue.push({ data: null, error: null, count: 2 });

      const gateway = new SupabaseRoomGateway(mock as unknown as SupabaseClient);
      const result = await gateway.getRoomDetail('mirador', 'room-1');

      expect(result?.room.weekendPrice).toBe(120); // 100 * 1.2
    });

    it('normalizes weekend_price=null to basePrice * 1.2', async () => {
      const mock = createMockSupabase();
      mock.queue.push({ data: mockHotel(), error: null });
      mock.queue.push({ data: mockRoom({ weekend_price: null }), error: null });
      mock.queue.push({ data: null, error: null, count: 2 });

      const gateway = new SupabaseRoomGateway(mock as unknown as SupabaseClient);
      const result = await gateway.getRoomDetail('mirador', 'room-1');

      expect(result?.room.weekendPrice).toBe(120); // 100 * 1.2
    });
  });

  describe('getAvailability', () => {
    it('returns per-day availability with blocked nights from bookings', async () => {
      const mock = createMockSupabase();
      mock.queue.push({ data: { price: 100, weekend_price: 150 }, error: null });
      mock.queue.push({
        data: [{ check_in: '2026-09-10', check_out: '2026-09-11' }],
        error: null,
      });

      const gateway = new SupabaseRoomGateway(mock as unknown as SupabaseClient);
      const availability = await gateway.getAvailability('room-1', {
        from: new Date('2026-09-10T12:00:00Z'),
        to: new Date('2026-09-13T12:00:00Z'),
      });

      expect(availability).toHaveLength(3);
      expect(availability[0].date).toBe('2026-09-10');
      expect(availability[0].available).toBe(false);
      expect(availability[0].price).toBe(100);
      expect(availability[1].date).toBe('2026-09-11');
      expect(availability[1].available).toBe(true);
      expect(availability[1].price).toBe(150);
      expect(availability[2].date).toBe('2026-09-12');
      expect(availability[2].available).toBe(true);
      expect(availability[2].price).toBe(150);
    });

    it('normalizes weekend_price=0 to basePrice * 1.2 in availability calendar', async () => {
      const mock = createMockSupabase();
      mock.queue.push({ data: { price: 100, weekend_price: 0 }, error: null });
      mock.queue.push({ data: [], error: null });

      const gateway = new SupabaseRoomGateway(mock as unknown as SupabaseClient);
      const availability = await gateway.getAvailability('room-1', {
        from: new Date('2026-09-10T12:00:00Z'), // Thursday
        to: new Date('2026-09-13T12:00:00Z'), // Sunday (3 nights: Thu, Fri, Sat)
      });

      expect(availability).toHaveLength(3);
      expect(availability[0].date).toBe('2026-09-10'); // Thursday
      expect(availability[0].price).toBe(100); // weekday
      expect(availability[1].date).toBe('2026-09-11'); // Friday
      expect(availability[1].price).toBe(120); // weekend (100 * 1.2, normalized from 0)
      expect(availability[2].date).toBe('2026-09-12'); // Saturday
      expect(availability[2].price).toBe(120); // weekend (100 * 1.2, normalized from 0)
    });
  });

  describe('getBookingsInWindow', () => {
    it('returns bookings overlapping the requested window', async () => {
      const mock = createMockSupabase();
      mock.queue.push({
        data: [{ check_in: '2026-09-10', check_out: '2026-09-13' }],
        error: null,
      });

      const gateway = new SupabaseRoomGateway(mock as unknown as SupabaseClient);
      const bookings = await gateway.getBookingsInWindow(
        'room-1',
        new Date('2026-09-01T12:00:00Z'),
        new Date('2026-09-30T12:00:00Z'),
      );

      expect(bookings).toHaveLength(1);
      expect(bookings[0].checkIn.toISOString()).toBe('2026-09-10T00:00:00.000Z');
      expect(bookings[0].checkOut.toISOString()).toBe('2026-09-13T00:00:00.000Z');
    });
  });

  describe('race condition at checkout (S10)', () => {
    it('detects the no_overlapping_bookings DB constraint as a temporal collision', () => {
      const error = {
        message: 'violates exclusion constraint "no_overlapping_bookings"',
        code: '23P01',
      };

      expect(isTemporalCollision(error)).toBe(true);
    });
  });
});
