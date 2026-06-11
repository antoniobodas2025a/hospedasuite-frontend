'use client';

import { useEffect } from 'react';
import { trackAIReferrer } from '@/lib/ai-referral-tracker';

/**
 * AI Referral Tracker — Client-side activation
 *
 * Detects visitors referred from AI platforms (chatgpt.com, perplexity.ai)
 * and pushes structured events to window.dataLayer for GA4 isolation.
 *
 * This component must be mounted client-side to access document.referrer.
 */
export default function AIReferralTracker() {
  useEffect(() => {
    trackAIReferrer();
  }, []);

  return null; // Invisible component — only side effects
}
