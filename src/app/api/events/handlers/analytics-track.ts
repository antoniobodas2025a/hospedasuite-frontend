import { AnyEvent } from '@/lib/event-types';
import { registerHandler } from '@/lib/event-handlers';

export async function handleAnalyticsTrack(event: AnyEvent): Promise<void> {
  // Only track if PostHog is configured
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!posthogKey) {
    console.log('[analytics] PostHog not configured, skipping');
    return;
  }

  // In production, send to PostHog API
  // For now, just log
  console.log(`[analytics] ${event.type}`, {
    hotelId: event.metadata.hotelId,
    correlationId: event.metadata.correlationId,
  });
}

registerHandler('booking.created', handleAnalyticsTrack);
registerHandler('booking.cancelled', handleAnalyticsTrack);
registerHandler('payment.received', handleAnalyticsTrack);
registerHandler('trial.expired', handleAnalyticsTrack);
registerHandler('plan.downgrade_requested', handleAnalyticsTrack);
