// ============================================================================
// AI REFERRAL TRACKER — Dark Funnel Analytics
// ============================================================================
// Detects visitors referred from AI platforms (chatgpt.com, perplexity.ai)
// and pushes structured events to window.dataLayer for GA4 isolation.
// Uses custom UTM parameters to tag AI-sourced traffic exclusively.

const AI_REFERRERS = ['chatgpt.com', 'perplexity.ai', 'chat.openai.com'];

export interface AIReferralEvent {
  event: 'ai_referral_detected';
  ai_source: string;
  referrer_url: string;
  page_path: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}

export function detectAIReferrer(referrer: string): string | null {
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();

    for (const aiDomain of AI_REFERRERS) {
      if (hostname.includes(aiDomain)) {
        return aiDomain;
      }
    }
  } catch {
    // Invalid URL — not an AI referrer
    return null;
  }

  return null;
}

export function buildAIReferralEvent(
  aiSource: string,
  referrerUrl: string,
  pagePath: string
): AIReferralEvent {
  return {
    event: 'ai_referral_detected',
    ai_source: aiSource,
    referrer_url: referrerUrl,
    page_path: pagePath,
    utm_source: aiSource.replace('.', '_'),
    utm_medium: 'organic_ai',
    utm_campaign: 'dark_funnel_ai',
  };
}

export function trackAIReferrer() {
  if (typeof window === 'undefined') return;

  const referrer = document.referrer;
  const aiSource = detectAIReferrer(referrer);

  if (!aiSource) return;

  // Ensure dataLayer exists
  if (!window.dataLayer) {
    window.dataLayer = [];
  }

  const event = buildAIReferralEvent(aiSource, referrer, window.location.pathname);
  (window.dataLayer as any).push(event);
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}
