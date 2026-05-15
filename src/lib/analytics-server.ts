/**
 * 📊 Server-Side Analytics — PostHog para server actions y webhooks
 *
 * Usa la API REST de PostHog directamente (no necesita navegador).
 * Se usa en webhooks, cron jobs, y server actions.
 */

interface PostHogEvent {
  event: string;
  distinct_id: string;
  properties: Record<string, unknown>;
}

/**
 * Envía un evento a PostHog vía API REST.
 * Nunca lanza error — si falla, solo loguea en consola.
 */
export async function trackPostHogEvent(event: PostHogEvent): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) return; // PostHog no configurado

  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event: event.event,
        distinct_id: event.distinct_id,
        properties: event.properties,
      }),
    });
  } catch (err: any) {
    console.error('[ANALYTICS] Error enviando evento a PostHog:', err.message);
  }
}

// ——— Helpers tipados ———

export function trackPaymentCompleted(hotelId: string, amount: number, plan: string, reference?: string) {
  return trackPostHogEvent({
    event: 'payment_completed',
    distinct_id: hotelId,
    properties: { amount, plan, wompi_reference: reference },
  });
}

export function trackPlanUpgraded(hotelId: string, fromPlan: string, toPlan: string) {
  return trackPostHogEvent({
    event: 'plan_upgraded',
    distinct_id: hotelId,
    properties: { from_plan: fromPlan, to_plan: toPlan },
  });
}

export function trackTrialExpired(hotelId: string, daysInTrial: number, plan: string) {
  return trackPostHogEvent({
    event: 'trial_expired',
    distinct_id: hotelId,
    properties: { days_in_trial: daysInTrial, plan, converted: false },
  });
}

export function trackDowngradeRequested(hotelId: string, fromPlan: string, toPlan: string) {
  return trackPostHogEvent({
    event: 'downgrade_requested',
    distinct_id: hotelId,
    properties: { from_plan: fromPlan, to_plan: toPlan },
  });
}
