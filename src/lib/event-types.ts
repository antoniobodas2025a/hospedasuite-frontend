import { z } from 'zod';

// Common metadata schema
export const EventMetadataSchema = z.object({
  correlationId: z.string().uuid(),
  timestamp: z.string().datetime(),
  source: z.string(), // e.g., 'server-action', 'webhook', 'cron'
  hotelId: z.string().uuid().optional(),
});

export type EventMetadata = z.infer<typeof EventMetadataSchema>;

// ── Booking Events ──────────────────────────────────────────────
export const BookingCreatedEventSchema = z.object({
  type: z.literal('booking.created'),
  payload: z.object({
    bookingId: z.string().uuid(),
    hotelId: z.string().uuid(),
    guestId: z.string().uuid(),
    roomId: z.string().uuid(),
    checkIn: z.string(),
    checkOut: z.string(),
    totalAmount: z.number(),
    status: z.string(),
  }),
  metadata: EventMetadataSchema,
});

export const BookingUpdatedEventSchema = z.object({
  type: z.literal('booking.updated'),
  payload: z.object({
    bookingId: z.string().uuid(),
    hotelId: z.string().uuid(),
    changes: z.record(z.string(), z.unknown()),
  }),
  metadata: EventMetadataSchema,
});

export const BookingCancelledEventSchema = z.object({
  type: z.literal('booking.cancelled'),
  payload: z.object({
    bookingId: z.string().uuid(),
    hotelId: z.string().uuid(),
    reason: z.string().optional(),
  }),
  metadata: EventMetadataSchema,
});

export const BookingStatusChangedEventSchema = z.object({
  type: z.literal('booking.status_changed'),
  payload: z.object({
    bookingId: z.string().uuid(),
    hotelId: z.string().uuid(),
    oldStatus: z.string(),
    newStatus: z.string(),
  }),
  metadata: EventMetadataSchema,
});

export const BookingExpiredEventSchema = z.object({
  type: z.literal('booking.expired'),
  payload: z.object({
    bookingId: z.string().uuid(),
    hotelId: z.string().uuid(),
    roomId: z.string().uuid(),
  }),
  metadata: EventMetadataSchema,
});

// ── Payment Events ──────────────────────────────────────────────
export const PaymentReceivedEventSchema = z.object({
  type: z.literal('payment.received'),
  payload: z.object({
    paymentId: z.string().uuid(),
    bookingId: z.string().uuid().optional(),
    hotelId: z.string().uuid(),
    amount: z.number(),
    currency: z.string(),
    method: z.string(),
  }),
  metadata: EventMetadataSchema,
});

export const PaymentApprovedEventSchema = z.object({
  type: z.literal('payment.approved'),
  payload: z.object({
    transactionId: z.string(),
    bookingId: z.string().uuid(),
    hotelId: z.string().uuid(),
    amount: z.number(),
    reference: z.string(),
  }),
  metadata: EventMetadataSchema,
});

export const PaymentDeclinedEventSchema = z.object({
  type: z.literal('payment.declined'),
  payload: z.object({
    transactionId: z.string(),
    hotelId: z.string().uuid(),
    reason: z.string().optional(),
  }),
  metadata: EventMetadataSchema,
});

// ── Room Events ─────────────────────────────────────────────────
export const RoomStatusChangedEventSchema = z.object({
  type: z.literal('room.status_changed'),
  payload: z.object({
    roomId: z.string().uuid(),
    hotelId: z.string().uuid(),
    oldStatus: z.string(),
    newStatus: z.string(),
  }),
  metadata: EventMetadataSchema,
});

export const RoomCreatedEventSchema = z.object({
  type: z.literal('room.created'),
  payload: z.object({
    roomId: z.string().uuid(),
    hotelId: z.string().uuid(),
    name: z.string(),
    type: z.string().optional(),
    price: z.number(),
  }),
  metadata: EventMetadataSchema,
});

export const RoomUpdatedEventSchema = z.object({
  type: z.literal('room.updated'),
  payload: z.object({
    roomId: z.string().uuid(),
    hotelId: z.string().uuid(),
    changes: z.record(z.string(), z.unknown()),
  }),
  metadata: EventMetadataSchema,
});

export const RoomDeletedEventSchema = z.object({
  type: z.literal('room.deleted'),
  payload: z.object({
    roomId: z.string().uuid(),
    hotelId: z.string().uuid(),
  }),
  metadata: EventMetadataSchema,
});

// ── Guest Events ────────────────────────────────────────────────
export const GuestCreatedEventSchema = z.object({
  type: z.literal('guest.created'),
  payload: z.object({
    guestId: z.string().uuid(),
    hotelId: z.string().uuid(),
    name: z.string(),
    email: z.string().email().optional(),
  }),
  metadata: EventMetadataSchema,
});

export const GuestUpdatedEventSchema = z.object({
  type: z.literal('guest.updated'),
  payload: z.object({
    guestId: z.string().uuid(),
    hotelId: z.string().uuid(),
    changes: z.record(z.string(), z.unknown()),
  }),
  metadata: EventMetadataSchema,
});

export const GuestDeletedEventSchema = z.object({
  type: z.literal('guest.deleted'),
  payload: z.object({
    guestId: z.string().uuid(),
    hotelId: z.string().uuid(),
  }),
  metadata: EventMetadataSchema,
});

// ── OTA Events ──────────────────────────────────────────────────
export const OtaSyncRequestedEventSchema = z.object({
  type: z.literal('ota.sync.requested'),
  payload: z.object({
    hotelId: z.string().uuid(),
    roomId: z.string().uuid().optional(),
  }),
  metadata: EventMetadataSchema,
});

export const OtaBookingCreatedEventSchema = z.object({
  type: z.literal('ota.booking_created'),
  payload: z.object({
    hotelId: z.string().uuid(),
    bookingData: z.record(z.string(), z.unknown()),
    channel: z.string(),
  }),
  metadata: EventMetadataSchema,
});

export const OtaBookingCancelledEventSchema = z.object({
  type: z.literal('ota.booking_cancelled'),
  payload: z.object({
    hotelId: z.string().uuid(),
    bookingId: z.string().uuid(),
    channel: z.string(),
  }),
  metadata: EventMetadataSchema,
});

// ── Billing Events ──────────────────────────────────────────────
export const TrialExpiredEventSchema = z.object({
  type: z.literal('trial.expired'),
  payload: z.object({
    hotelId: z.string().uuid(),
    trialEndsAt: z.string(),
  }),
  metadata: EventMetadataSchema,
});

export const TrialExpiringSoonEventSchema = z.object({
  type: z.literal('trial.expiring_soon'),
  payload: z.object({
    hotelId: z.string().uuid(),
    trialEndsAt: z.string(),
    daysRemaining: z.number(),
  }),
  metadata: EventMetadataSchema,
});

export const PlanDowngradeRequestedEventSchema = z.object({
  type: z.literal('plan.downgrade_requested'),
  payload: z.object({
    hotelId: z.string().uuid(),
    fromPlan: z.string(),
    toPlan: z.string(),
  }),
  metadata: EventMetadataSchema,
});

// ── Cache Invalidation Event (PR 2) ─────────────────────────────
export const CacheInvalidateEventSchema = z.object({
  type: z.literal('cache.invalidate'),
  payload: z.object({
    paths: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  }),
  metadata: EventMetadataSchema,
});

// ── Union type of all event schemas ─────────────────────────────
export const AllEventSchemas = z.discriminatedUnion('type', [
  BookingCreatedEventSchema,
  BookingUpdatedEventSchema,
  BookingCancelledEventSchema,
  BookingStatusChangedEventSchema,
  BookingExpiredEventSchema,
  PaymentReceivedEventSchema,
  PaymentApprovedEventSchema,
  PaymentDeclinedEventSchema,
  RoomStatusChangedEventSchema,
  RoomCreatedEventSchema,
  RoomUpdatedEventSchema,
  RoomDeletedEventSchema,
  GuestCreatedEventSchema,
  GuestUpdatedEventSchema,
  GuestDeletedEventSchema,
  OtaSyncRequestedEventSchema,
  OtaBookingCreatedEventSchema,
  OtaBookingCancelledEventSchema,
  TrialExpiredEventSchema,
  TrialExpiringSoonEventSchema,
  PlanDowngradeRequestedEventSchema,
  CacheInvalidateEventSchema,
]);

export type AnyEvent = z.infer<typeof AllEventSchemas>;

// ── Event type constants ────────────────────────────────────────
export const EVENT_TYPES = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_UPDATED: 'booking.updated',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_STATUS_CHANGED: 'booking.status_changed',
  BOOKING_EXPIRED: 'booking.expired',
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_APPROVED: 'payment.approved',
  PAYMENT_DECLINED: 'payment.declined',
  ROOM_STATUS_CHANGED: 'room.status_changed',
  ROOM_CREATED: 'room.created',
  ROOM_UPDATED: 'room.updated',
  ROOM_DELETED: 'room.deleted',
  GUEST_CREATED: 'guest.created',
  GUEST_UPDATED: 'guest.updated',
  GUEST_DELETED: 'guest.deleted',
  OTA_SYNC_REQUESTED: 'ota.sync.requested',
  OTA_BOOKING_CREATED: 'ota.booking_created',
  OTA_BOOKING_CANCELLED: 'ota.booking_cancelled',
  TRIAL_EXPIRED: 'trial.expired',
  TRIAL_EXPIRING_SOON: 'trial.expiring_soon',
  PLAN_DOWNGRADE_REQUESTED: 'plan.downgrade_requested',
  CACHE_INVALIDATE: 'cache.invalidate',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
