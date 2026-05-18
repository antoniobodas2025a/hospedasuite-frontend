# Realtime Expansion Specification

## Purpose

Expand Supabase Realtime subscriptions beyond bookings to rooms, payments, and service_items. Event layer is additive — does not break existing Realtime on bookings.

## Requirements

### Requirement: Room Realtime Subscription

The system MUST subscribe to `rooms` table changes (INSERT, UPDATE, DELETE) and trigger `router.refresh()` on pages displaying room data.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Room status change | Room updated via action | Realtime fires | Room list refreshes |
| Room created | New room inserted | Realtime fires | Room list refreshes |
| Room deleted | Room removed | Realtime fires | Room list refreshes |

### Requirement: Payment Realtime Subscription

The system MUST subscribe to `payments` table changes and trigger `router.refresh()` on booking detail and payment pages.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Payment received | Payment inserted | Realtime fires | Booking detail refreshes |
| Payment status change | Payment updated | Realtime fires | Payment list refreshes |

### Requirement: Service Items Realtime Subscription

The system MUST subscribe to `service_items` table changes and trigger `router.refresh()` on booking detail pages.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Service added | Service item inserted | Realtime fires | Booking detail refreshes |
| Service updated | Service item modified | Realtime fires | Booking detail refreshes |

### Requirement: Additive Compatibility

The new Realtime subscriptions MUST NOT interfere with existing bookings Realtime. All subscriptions run independently.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Existing bookings | Booking Realtime active | New subs added | Both work independently |
| Multiple subs | 4 table subscriptions | Page loads | All subscriptions established |
