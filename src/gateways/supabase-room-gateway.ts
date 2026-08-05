import type { SupabaseClient } from '@supabase/supabase-js';
import type { RoomDetail, DateRange, Availability } from '@/domain/room-availability';
import type { RoomDetailGateway } from '@/use-cases/room-detail/gateway.interface';

const HOTEL_SELECT = 'id, name, slug, status, subscription_status, go_live';
const ROOM_SELECT = 'id, name, description, capacity, beds, bed_type, price, base_price, price_base, weekend_price, status, gallery, amenities';

function parseGallery(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((img) => (typeof img === 'string' ? img : img?.url))
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
}

function parseAmenities(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string');
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isWeekendNight(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 5 || day === 6;
}

function addDay(date: Date): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export class SupabaseRoomGateway implements RoomDetailGateway {
  constructor(private supabase: SupabaseClient) {}

  async getRoomDetail(hotelSlug: string, roomId: string): Promise<RoomDetail | null> {
    const { data: hotel, error: hotelError } = await this.supabase
      .from('hotels')
      .select(HOTEL_SELECT)
      .eq('slug', hotelSlug)
      .maybeSingle();

    if (hotelError || !hotel) {
      return null;
    }

    if (hotel.status !== 'active' || hotel.go_live !== true) {
      return null;
    }

    if (hotel.subscription_status === 'cancelled') {
      return null;
    }

    const restricted = hotel.subscription_status !== 'active';

    const { data: room, error: roomError } = await this.supabase
      .from('rooms')
      .select(ROOM_SELECT)
      .eq('hotel_id', hotel.id)
      .eq('id', roomId)
      .maybeSingle();

    if (roomError || !room || room.status === 'maintenance') {
      return null;
    }

    const basePrice = room.price ?? room.base_price ?? room.price_base ?? 0;
    const weekendPrice = room.weekend_price ?? basePrice * 1.2;

    return {
      id: room.id,
      name: room.name,
      description: room.description ?? null,
      capacity: room.capacity ?? 0,
      beds: room.beds ?? 0,
      bedType: room.bed_type ?? '',
      gallery: parseGallery(room.gallery),
      amenities: parseAmenities(room.amenities),
      pricePerNight: basePrice,
      weekendPrice,
      status: room.status === 'maintenance' || room.status === 'inactive' ? room.status : 'active',
      restricted,
    };
  }

  async getAvailability(roomId: string, dateRange: DateRange): Promise<Availability[]> {
    const { data: room } = await this.supabase
      .from('rooms')
      .select('price, base_price, price_base, weekend_price')
      .eq('id', roomId)
      .maybeSingle();

    const basePrice = room?.price ?? room?.base_price ?? room?.price_base ?? 0;
    const weekendPrice = room?.weekend_price ?? basePrice * 1.2;

    const { data: bookings } = await this.supabase
      .from('bookings')
      .select('check_in, check_out')
      .eq('room_id', roomId)
      .or('status.neq.cancelled,status.is.null')
      .lt('check_in', toISODate(dateRange.to))
      .gt('check_out', toISODate(dateRange.from));

    const blocked = new Set<string>();
    for (const booking of bookings || []) {
      const start = new Date(`${booking.check_in}T00:00:00Z`);
      const end = new Date(`${booking.check_out}T00:00:00Z`);
      for (let current = start; current < end; current = addDay(current)) {
        blocked.add(toISODate(current));
      }
    }

    const result: Availability[] = [];
    for (let current = new Date(dateRange.from.getTime()); current < dateRange.to; current = addDay(current)) {
      const date = toISODate(current);
      result.push({
        date,
        available: !blocked.has(date),
        price: isWeekendNight(current) ? weekendPrice : basePrice,
      });
    }

    return result;
  }

  async getBookingsInWindow(
    roomId: string,
    from: Date,
    to: Date,
  ): Promise<Array<{ checkIn: Date; checkOut: Date }>> {
    const { data: bookings } = await this.supabase
      .from('bookings')
      .select('check_in, check_out')
      .eq('room_id', roomId)
      .or('status.neq.cancelled,status.is.null')
      .lt('check_in', toISODate(to))
      .gt('check_out', toISODate(from));

    return (bookings || []).map((booking) => ({
      checkIn: new Date(`${booking.check_in}T00:00:00Z`),
      checkOut: new Date(`${booking.check_out}T00:00:00Z`),
    }));
  }
}

export function createRoomDetailGateway(supabase: SupabaseClient): RoomDetailGateway {
  return new SupabaseRoomGateway(supabase);
}
