/**
 * 📊 Product Analytics — PostHog Event Tracking
 *
 * Trackea eventos clave del funnel SaaS para medir conversión,
 * retención, y revenue. Sin esto, el negocio es una caja negra.
 *
 * Uso:
 *   trackHotelSignup(hotelId);
 *   trackPlanUpgraded(hotelId, 'starter', 'pro');
 */

import posthog from 'posthog-js';
import type { BookingAnalyticsEvent } from '@/types';

// Inicialización (se llama una vez en el layout)
export function initPostHog() {
  if (typeof window === 'undefined') return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key) {
    // PostHog no configurado — modo silencioso
    return;
  }

  posthog.init(key, {
    api_host: host || 'https://us.i.posthog.com',
    person_profiles: 'identified_only', // Solo crear perfiles para usuarios identificados
    capture_pageview: true,
    capture_pageleave: true,
  });
}

// ——— Eventos del Funnel SaaS ———

/**
 * Hotel se registró por primera vez.
 */
export function trackHotelSignup(hotelId: string, hotelName?: string) {
  posthog.capture('hotel_signed_up', {
    hotel_id: hotelId,
    hotel_name: hotelName,
  });
}

/**
 * Trial activado (hotel empieza a usar el sistema).
 */
export function trackTrialActivated(hotelId: string, plan: string) {
  posthog.capture('trial_activated', {
    hotel_id: hotelId,
    plan,
  });
}

/**
 * Hotel subió de plan (upgrade).
 */
export function trackPlanUpgraded(hotelId: string, fromPlan: string, toPlan: string, amount?: number) {
  posthog.capture('plan_upgraded', {
    hotel_id: hotelId,
    from_plan: fromPlan,
    to_plan: toPlan,
    amount,
  });
}

/**
 * Pago completado exitosamente.
 */
export function trackPaymentCompleted(hotelId: string, amount: number, plan: string, reference?: string) {
  posthog.capture('payment_completed', {
    hotel_id: hotelId,
    amount,
    plan,
    wompi_reference: reference,
  });
}

/**
 * Trial expiró sin pagar.
 */
export function trackTrialExpired(hotelId: string, daysInTrial: number, plan: string) {
  posthog.capture('trial_expired', {
    hotel_id: hotelId,
    days_in_trial: daysInTrial,
    plan,
    converted: false,
  });
}

/**
 * Hotel solicitó downgrade de plan.
 */
export function trackDowngradeRequested(hotelId: string, fromPlan: string, toPlan: string) {
  posthog.capture('downgrade_requested', {
    hotel_id: hotelId,
    from_plan: fromPlan,
    to_plan: toPlan,
  });
}

/**
 * Identificar al usuario actual para vincular eventos.
 */
export function identifyHotel(hotelId: string, email?: string, name?: string) {
  posthog.identify(hotelId, {
    email,
    name,
    type: 'hotel',
  });
}

// ——— Booking Flow Events ———

function captureBookingEvent(event: BookingAnalyticsEvent) {
  if (typeof window === 'undefined') return;
  posthog.capture(event.event, event.properties);
}

export function trackViewRoom(
  properties: Extract<BookingAnalyticsEvent, { event: 'view_room' }>['properties']
) {
  captureBookingEvent({ event: 'view_room', properties });
}

export function trackClickReserve(
  properties: Extract<BookingAnalyticsEvent, { event: 'click_reserve' }>['properties']
) {
  captureBookingEvent({ event: 'click_reserve', properties });
}

export function trackOpenRoomModal(
  properties: Extract<BookingAnalyticsEvent, { event: 'open_room_modal' }>['properties']
) {
  captureBookingEvent({ event: 'open_room_modal', properties });
}

export function trackCloseRoomModal(
  properties: Extract<BookingAnalyticsEvent, { event: 'close_room_modal' }>['properties']
) {
  captureBookingEvent({ event: 'close_room_modal', properties });
}

export function trackCompleteBooking(
  properties: Extract<BookingAnalyticsEvent, { event: 'complete_booking' }>['properties']
) {
  captureBookingEvent({ event: 'complete_booking', properties });
}

export function trackAbandonBooking(
  properties: Extract<BookingAnalyticsEvent, { event: 'abandon_booking' }>['properties']
) {
  captureBookingEvent({ event: 'abandon_booking', properties });
}
