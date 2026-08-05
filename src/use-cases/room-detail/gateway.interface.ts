import type { DateRange, Availability, RoomDetail, HotelContext } from '@/domain/room-availability';

export interface RoomDetailResult {
  room: RoomDetail;
  hotel: HotelContext;
}

export interface RoomDetailGateway {
  getRoomDetail(hotelSlug: string, roomId: string): Promise<RoomDetailResult | null>;
  getAvailability(roomId: string, dateRange: DateRange): Promise<Availability[]>;
  getBookingsInWindow(
    roomId: string,
    from: Date,
    to: Date
  ): Promise<Array<{ checkIn: Date; checkOut: Date }>>;
}
