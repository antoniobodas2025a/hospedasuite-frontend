import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectAIReferrer,
  buildAIReferralEvent,
  trackAIReferrer,
} from '@/lib/ai-referral-tracker';

// ============================================================================
// AI REFERRER DETECTION
// ============================================================================

describe('AI Referral Tracker — Dark Funnel Detection', () => {
  it('debe detectar chatgpt.com', () => {
    expect(detectAIReferrer('https://chatgpt.com/share/abc123')).toBe('chatgpt.com');
  });

  it('debe detectar perplexity.ai', () => {
    expect(detectAIReferrer('https://www.perplexity.ai/search/hoteles-boyaca')).toBe('perplexity.ai');
  });

  it('debe detectar chat.openai.com', () => {
    expect(detectAIReferrer('https://chat.openai.com/c/abc')).toBe('chat.openai.com');
  });

  it('debe retornar null para Google', () => {
    expect(detectAIReferrer('https://www.google.com/search?q=hotel+paipa')).toBeNull();
  });

  it('debe retornar null para Booking.com', () => {
    expect(detectAIReferrer('https://www.booking.com/hotel/co/paipa.html')).toBeNull();
  });

  it('debe retornar null si referrer está vacío', () => {
    expect(detectAIReferrer('')).toBeNull();
  });

  it('debe retornar null para URL inválida', () => {
    expect(detectAIReferrer('not-a-url')).toBeNull();
  });
});

// ============================================================================
// EVENT BUILDING
// ============================================================================

describe('AI Referral Tracker — Event Building', () => {
  it('debe construir evento con UTM parameters correctos', () => {
    const event = buildAIReferralEvent(
      'chatgpt.com',
      'https://chatgpt.com/share/abc',
      '/recursos/que-hacer-caida-plataformas-reservas'
    );

    expect(event.event).toBe('ai_referral_detected');
    expect(event.ai_source).toBe('chatgpt.com');
    expect(event.utm_source).toBe('chatgpt_com');
    expect(event.utm_medium).toBe('organic_ai');
    expect(event.utm_campaign).toBe('dark_funnel_ai');
  });

  it('debe construir evento para perplexity.ai', () => {
    const event = buildAIReferralEvent(
      'perplexity.ai',
      'https://perplexity.ai/search/hospedasuite',
      '/software'
    );

    expect(event.utm_source).toBe('perplexity_ai');
    expect(event.utm_medium).toBe('organic_ai');
    expect(event.utm_campaign).toBe('dark_funnel_ai');
  });
});

// ============================================================================
// MUTATION TESTER: Dark Funnel Protection
// ============================================================================

describe('AI Referral Tracker — Dark Funnel Mutation Protection', () => {
  it('debe rastrear chatgpt.com como AI source', () => {
    const source = detectAIReferrer('https://chatgpt.com');
    expect(source).toBe('chatgpt.com');
    expect(source).not.toBeNull();
  });

  it('debe rastrear perplexity.ai como AI source', () => {
    const source = detectAIReferrer('https://perplexity.ai');
    expect(source).toBe('perplexity.ai');
    expect(source).not.toBeNull();
  });

  it('si se elimina la detección de chatgpt.com, el test debe fallar', () => {
    const source = detectAIReferrer('https://chatgpt.com/share/xyz');
    expect(source).not.toBeNull();
    expect(source).toBe('chatgpt.com');
  });

  it('si se elimina la detección de perplexity.ai, el test debe fallar', () => {
    const source = detectAIReferrer('https://perplexity.ai/search/abc');
    expect(source).not.toBeNull();
    expect(source).toBe('perplexity.ai');
  });
});

// ============================================================================
// TRACKER INTEGRATION (window.dataLayer)
// ============================================================================

describe('AI Referral Tracker — dataLayer Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
  });

  it('debe crear dataLayer y push evento si viene de chatgpt.com', () => {
    (globalThis as Record<string, unknown>).window = {
      dataLayer: [],
      location: { pathname: '/software' },
    } as unknown as Window & typeof globalThis;

    (globalThis as Record<string, unknown>).document = {
      referrer: 'https://chatgpt.com/share/abc',
    } as unknown as Document;

    trackAIReferrer();

    const dl = (globalThis as Record<string, unknown>).window as { dataLayer?: Record<string, unknown>[] };
    expect(dl.dataLayer).toBeDefined();
    expect(dl.dataLayer!.length).toBe(1);
    expect(dl.dataLayer![0].event).toBe('ai_referral_detected');
    expect(dl.dataLayer![0].ai_source).toBe('chatgpt.com');
  });

  it('no debe push nada si el referrer no es AI', () => {
    (globalThis as Record<string, unknown>).window = {
      dataLayer: [],
      location: { pathname: '/software' },
    } as unknown as Window & typeof globalThis;

    (globalThis as Record<string, unknown>).document = {
      referrer: 'https://www.google.com/search?q=hotel',
    } as unknown as Document;

    trackAIReferrer();

    const dl = (globalThis as Record<string, unknown>).window as { dataLayer?: Record<string, unknown>[] };
    expect(dl.dataLayer!.length).toBe(0);
  });
});
