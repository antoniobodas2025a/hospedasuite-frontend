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
