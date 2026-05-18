import { describe, it, expect } from 'vitest';
import { 
  BookingCreatedEventSchema, 
  PaymentApprovedEventSchema,
  AllEventSchemas,
  EVENT_TYPES 
} from '../event-types';

describe('event-types', () => {
  describe('BookingCreatedEventSchema', () => {
    it('should validate a valid booking.created event', () => {
      const event = {
        type: 'booking.created',
        payload: {
          bookingId: '550e8400-e29b-41d4-a716-446655440000',
          hotelId: '550e8400-e29b-41d4-a716-446655440001',
          guestId: '550e8400-e29b-41d4-a716-446655440002',
          roomId: '550e8400-e29b-41d4-a716-446655440003',
          checkIn: '2026-06-01',
          checkOut: '2026-06-05',
          totalAmount: 1500000,
          status: 'confirmed',
        },
        metadata: {
          correlationId: '550e8400-e29b-41d4-a716-446655440004',
          timestamp: '2026-05-18T12:00:00Z',
          source: 'server-action',
          hotelId: '550e8400-e29b-41d4-a716-446655440001',
        },
      };

      const result = BookingCreatedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const event = {
        type: 'booking.created',
        payload: {
          bookingId: '550e8400-e29b-41d4-a716-446655440000',
          // missing hotelId, guestId, etc.
        },
        metadata: {
          correlationId: '550e8400-e29b-41d4-a716-446655440004',
          timestamp: '2026-05-18T12:00:00Z',
          source: 'server-action',
        },
      };

      const result = BookingCreatedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('AllEventSchemas discriminated union', () => {
    it('should discriminate by type field', () => {
      const event = {
        type: 'payment.approved',
        payload: {
          transactionId: 'txn_123',
          bookingId: '550e8400-e29b-41d4-a716-446655440000',
          hotelId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 1500000,
          reference: 'ref_123',
        },
        metadata: {
          correlationId: '550e8400-e29b-41d4-a716-446655440004',
          timestamp: '2026-05-18T12:00:00Z',
          source: 'webhook',
          hotelId: '550e8400-e29b-41d4-a716-446655440001',
        },
      };

      const result = AllEventSchemas.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should reject unknown event type', () => {
      const event = {
        type: 'unknown.event',
        payload: {},
        metadata: {
          correlationId: '550e8400-e29b-41d4-a716-446655440004',
          timestamp: '2026-05-18T12:00:00Z',
          source: 'test',
        },
      };

      const result = AllEventSchemas.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('EVENT_TYPES constants', () => {
    it('should have all 21 event types', () => {
      expect(Object.keys(EVENT_TYPES).length).toBe(21);
    });

    it('should have correct values', () => {
      expect(EVENT_TYPES.BOOKING_CREATED).toBe('booking.created');
      expect(EVENT_TYPES.PAYMENT_APPROVED).toBe('payment.approved');
      expect(EVENT_TYPES.ROOM_STATUS_CHANGED).toBe('room.status_changed');
    });
  });
});
