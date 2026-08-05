import '@/use-cases/room-detail/gateway.interface';
import type { RoomDetailGateway } from '@/use-cases/room-detail/gateway.interface';
import { describe, it, expect } from 'vitest';

class StubGateway implements RoomDetailGateway {
  async getRoomDetail() {
    return null;
  }

  async getAvailability() {
    return [];
  }

  async getBookingsInWindow() {
    return [];
  }
}

describe('RoomDetailGateway interface contract', () => {
  it('can be implemented with all required methods', () => {
    const gateway = new StubGateway();

    expect(typeof gateway.getRoomDetail).toBe('function');
    expect(typeof gateway.getAvailability).toBe('function');
    expect(typeof gateway.getBookingsInWindow).toBe('function');
  });

  it('returns the expected shapes from a concrete implementation', async () => {
    const gateway: RoomDetailGateway = {
      getRoomDetail: async () => ({
        id: 'room-1',
        name: 'Suite',
        description: null,
        capacity: 2,
        beds: 1,
        bedType: 'Queen',
        gallery: [],
        amenities: [],
        pricePerNight: 100,
        weekendPrice: 150,
        status: 'active' as const,
      }),
      getAvailability: async () => [
        { date: '2026-09-10', available: true, price: 100 },
      ],
      getBookingsInWindow: async () => [
        { checkIn: new Date('2026-09-10T12:00:00Z'), checkOut: new Date('2026-09-13T12:00:00Z') },
      ],
    };

    const room = await gateway.getRoomDetail('hotel-slug', 'room-1');
    expect(room).not.toBeNull();
    expect(room?.name).toBe('Suite');

    const availability = await gateway.getAvailability('room-1', {
      from: new Date('2026-09-10T12:00:00Z'),
      to: new Date('2026-09-13T12:00:00Z'),
    });
    expect(availability).toHaveLength(1);
    expect(availability[0].available).toBe(true);

    const bookings = await gateway.getBookingsInWindow(
      'room-1',
      new Date('2026-09-01T12:00:00Z'),
      new Date('2026-09-30T12:00:00Z')
    );
    expect(bookings).toHaveLength(1);
    expect(bookings[0].checkOut.toISOString()).toBe('2026-09-13T12:00:00.000Z');
  });
});
