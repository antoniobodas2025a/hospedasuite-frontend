import type { DateRange, Availability, RoomDetail } from '@/domain/room-availability';

export interface RoomDetailGateway {
  getRoomDetail(hotelSlug: string, roomId: string): Promise<RoomDetail | null>;
  getAvailability(roomId: string, dateRange: DateRange): Promise<Availability[]>;
  getBookingsInWindow(
    roomId: string,
    from: Date,
    to: Date
  ): Promise<Array<{ checkIn: Date; checkOut: Date }>>;
}
