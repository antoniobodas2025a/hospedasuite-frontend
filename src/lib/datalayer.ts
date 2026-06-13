// ============================================================================
// DATALAYER — Dark Funnel Analytics (GTM Event Tracking)
// ============================================================================
// Pushes structured events to window.dataLayer for GTM consumption.
// Operates silently — no UI, no user friction.

interface LeadCapturedEvent {
  event: 'lead_captured';
  city: string;
  roomCount: number;
  attack_line: string;
}

export function trackLeadCaptured(city: string, roomCount: number, attackLine: string) {
  if (typeof window === 'undefined') return;

  // Ensure dataLayer exists
  if (!window.dataLayer) {
    window.dataLayer = [];
  }

  const payload: LeadCapturedEvent = {
    event: 'lead_captured',
    city,
    roomCount,
    attack_line: attackLine,
  };

  (window.dataLayer as any).push(payload);
}

// Type augmentation for window.dataLayer
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}
