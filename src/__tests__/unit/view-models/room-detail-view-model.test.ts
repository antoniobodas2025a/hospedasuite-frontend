import { describe, it, expect } from 'vitest';
import {
  roomDetailViewModel,
  type RoomDetailViewModelInput,
} from '@/view-models/room-detail-view-model';
import type { RoomDetail, HotelContext, Availability } from '@/domain/room-availability';
import { validateAndParseDates } from '@/domain/room-availability';

function makeRoom(overrides: Partial<RoomDetail> = {}): RoomDetail {
  return {
    id: 'room-1',
    name: 'Suite Mirador',
    description: 'Habitación con vista panorámica',
    capacity: 2,
    beds: 1,
    bedType: 'King',
    gallery: ['https://example.com/room-1.jpg'],
    amenities: ['wifi', 'ac'],
    pricePerNight: 100000,
    weekendPrice: 150000,
    status: 'active',
    ...overrides,
  };
}

function makeHotel(overrides: Partial<HotelContext> = {}): HotelContext {
  return {
    id: 'hotel-1',
    name: 'Hotel Mirador',
    slug: 'hotel-mirador',
    city: 'Bogotá',
    totalRooms: 5,
    subscriptionStatus: 'active',
    status: 'active',
    taxRate: 0.19,
    cancellationPolicy: 'Cancelación gratuita hasta 24h antes',
    primaryColor: '#3b82f6',
    ...overrides,
  };
}

function makeDates(checkIn: string, checkOut: string) {
  const dates = validateAndParseDates(checkIn, checkOut);
  if (!dates) throw new Error(`Invalid date range ${checkIn} -> ${checkOut}`);
  return dates;
}

function availabilityForRange(checkIn: string, checkOut: string, available: boolean): Availability[] {
  const { checkIn: from, checkOut: to } = makeDates(checkIn, checkOut);
  const result: Availability[] = [];
  const current = new Date(from.getTime());
  while (current < to) {
    const date = current.toISOString().split('T')[0];
    result.push({ date, available, price: 100000 });
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return result;
}

describe('roomDetailViewModel', () => {
  it('returns error state when room is null', () => {
    const input: RoomDetailViewModelInput = {
      room: null,
      hotel: makeHotel(),
      dates: makeDates('2026-08-05', '2026-08-08'),
    };

    const result = roomDetailViewModel(input);

    expect(result.state).toBe('error');
    expect(result.error).toBe('Room not found or hotel inactive');
    expect(result.canBook).toBe(false);
  });

  it('returns error state when hotel is cancelled', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel({ subscriptionStatus: 'cancelled' }),
      dates: makeDates('2026-08-05', '2026-08-08'),
    };

    const result = roomDetailViewModel(input);

    expect(result.state).toBe('error');
    expect(result.error).toBe('Room not found or hotel inactive');
    expect(result.canBook).toBe(false);
  });

  it('returns gallery state when dates are missing', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel(),
      dates: null,
    };

    const result = roomDetailViewModel(input);

    expect(result.state).toBe('gallery');
    expect(result.pricing).toBeNull();
    expect(result.pricePerNight).toBe(100000);
    expect(result.weekendPrice).toBe(150000);
    expect(result.taxRate).toBe(0.19);
    expect(result.canBook).toBe(true);
    expect(result.error).toBeNull();
  });

  it('falls back weekend price to 1.2x weekday when room weekendPrice is zero', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom({ weekendPrice: 0 }),
      hotel: makeHotel(),
      dates: null,
    };

    const result = roomDetailViewModel(input);

    expect(result.pricePerNight).toBe(100000);
    expect(result.weekendPrice).toBe(120000);
  });

  it('returns dates_selected state with correct pricing when dates are available', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel(),
      dates: makeDates('2026-08-10', '2026-08-13'),
      availability: availabilityForRange('2026-08-10', '2026-08-13', true),
    };

    const result = roomDetailViewModel(input);

    expect(result.state).toBe('dates_selected');
    expect(result.pricing).not.toBeNull();
    expect(result.pricing?.weekdayNights).toBe(3);
    expect(result.pricing?.weekendNights).toBe(0);
    expect(result.pricing?.subtotal).toBe(300000);
    expect(result.pricing?.tax).toBe(57000);
    expect(result.pricing?.total).toBe(357000);
    expect(result.error).toBeNull();
  });

  it('returns sold_out state when no availability for selected dates', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel(),
      dates: makeDates('2026-08-05', '2026-08-08'),
      availability: availabilityForRange('2026-08-05', '2026-08-08', false),
    };

    const result = roomDetailViewModel(input);

    expect(result.state).toBe('sold_out');
    expect(result.suggestions).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('calculates weekday-only stay correctly (3 nights)', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel(),
      dates: makeDates('2026-08-10', '2026-08-13'), // Mon -> Thu
      availability: availabilityForRange('2026-08-10', '2026-08-13', true),
    };

    const result = roomDetailViewModel(input);

    expect(result.state).toBe('dates_selected');
    expect(result.pricing?.weekdayNights).toBe(3);
    expect(result.pricing?.weekendNights).toBe(0);
    expect(result.pricing?.weekdayPrice).toBe(100000);
    expect(result.pricing?.weekendPrice).toBe(150000);
    expect(result.pricing?.subtotal).toBe(300000);
    expect(result.pricing?.total).toBe(357000);
  });

  it('calculates mixed stay correctly (Thu-Sun: 1 weekday + 2 weekend)', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel(),
      dates: makeDates('2026-08-06', '2026-08-09'), // Thu -> Sun
      availability: availabilityForRange('2026-08-06', '2026-08-09', true),
    };

    const result = roomDetailViewModel(input);

    expect(result.state).toBe('dates_selected');
    expect(result.pricing?.weekdayNights).toBe(1);
    expect(result.pricing?.weekendNights).toBe(2);
    expect(result.pricing?.subtotal).toBe(400000);
    expect(result.pricing?.tax).toBe(76000);
    expect(result.pricing?.total).toBe(476000);
  });

  it('calculates weekend-only stay correctly (Fri-Sun: 2 weekend nights)', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel(),
      dates: makeDates('2026-08-07', '2026-08-09'), // Fri -> Sun
      availability: availabilityForRange('2026-08-07', '2026-08-09', true),
    };

    const result = roomDetailViewModel(input);

    expect(result.state).toBe('dates_selected');
    expect(result.pricing?.weekdayNights).toBe(0);
    expect(result.pricing?.weekendNights).toBe(2);
    expect(result.pricing?.subtotal).toBe(300000);
    expect(result.pricing?.total).toBe(357000);
  });

  it('sets showOtherRooms to false for a single-room hotel', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel({ totalRooms: 1 }),
      dates: null,
    };

    const result = roomDetailViewModel(input);

    expect(result.showOtherRooms).toBe(false);
  });

  it('sets showOtherRooms to true for a multi-room hotel', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel({ totalRooms: 5 }),
      dates: null,
    };

    const result = roomDetailViewModel(input);

    expect(result.showOtherRooms).toBe(true);
  });

  it('sets canBook to false when hotel subscription is past_due', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel({ subscriptionStatus: 'past_due' }),
      dates: makeDates('2026-08-05', '2026-08-08'),
      availability: availabilityForRange('2026-08-05', '2026-08-08', true),
    };

    const result = roomDetailViewModel(input);

    expect(result.canBook).toBe(false);
  });

  it('sets canBook to false when room is restricted', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom({ restricted: true }),
      hotel: makeHotel(),
      dates: makeDates('2026-08-05', '2026-08-08'),
      availability: availabilityForRange('2026-08-05', '2026-08-08', true),
    };

    const result = roomDetailViewModel(input);

    expect(result.canBook).toBe(false);
  });

  it('maps gallery URLs to GalleryItem objects', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom({ gallery: ['https://example.com/a.jpg', 'https://example.com/b.jpg'] }),
      hotel: makeHotel(),
      dates: null,
    };

    const result = roomDetailViewModel(input);

    expect(result.gallery).toHaveLength(2);
    expect(result.gallery[0].url).toBe('https://example.com/a.jpg');
    expect(result.coverImage).toBe('https://example.com/a.jpg');
  });

  it('uses placeholder cover image when gallery is empty', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom({ gallery: [] }),
      hotel: makeHotel(),
      dates: null,
    };

    const result = roomDetailViewModel(input);

    expect(result.gallery).toHaveLength(1);
    expect(result.gallery[0].url).toBe('/logo.png');
    expect(result.coverImage).toBe('/logo.png');
  });

  it('maps known amenities to Amenity objects', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom({ amenities: ['wifi'] }),
      hotel: makeHotel(),
      dates: null,
    };

    const result = roomDetailViewModel(input);

    expect(result.amenities).toHaveLength(1);
    expect(result.amenities[0].id).toBe('wifi');
    expect(result.amenities[0].label).toBe('Wi-Fi Gratis');
  });

  it('renders the breadcrumb pointing back to the hotel', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel({ name: 'Hotel Mirador', slug: 'hotel-mirador' }),
      dates: null,
    };

    const result = roomDetailViewModel(input);

    expect(result.breadcrumb.href).toBe('/hotel/hotel-mirador');
    expect(result.breadcrumb.label).toContain('Hotel Mirador');
    expect(result.breadcrumb.label).toContain('Suite Mirador');
  });

  it('includes initial dates in output when dates are provided', () => {
    const dates = makeDates('2026-08-10', '2026-08-13');
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel(),
      dates,
    };

    const result = roomDetailViewModel(input);

    expect(result.initialCheckIn).toEqual(dates.checkIn);
    expect(result.initialCheckOut).toEqual(dates.checkOut);
  });

  it('initial dates are undefined when dates are missing', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel(),
      dates: null,
    };

    const result = roomDetailViewModel(input);

    expect(result.initialCheckIn).toBeUndefined();
    expect(result.initialCheckOut).toBeUndefined();
  });

  it('exposes roomId and primaryColor from the room and hotel', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom({ id: 'room-abc' }),
      hotel: makeHotel({ primaryColor: '#c25a2a' }),
      dates: null,
    };

    const result = roomDetailViewModel(input);

    expect(result.roomId).toBe('room-abc');
    expect(result.primaryColor).toBe('#c25a2a');
  });

  it('initializes bookedDates as an empty array', () => {
    const input: RoomDetailViewModelInput = {
      room: makeRoom(),
      hotel: makeHotel(),
      dates: null,
    };

    const result = roomDetailViewModel(input);

    expect(result.bookedDates).toEqual([]);
  });
});
