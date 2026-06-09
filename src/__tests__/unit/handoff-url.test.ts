import { preserveSearchParams, RELEVANT_PARAMS } from '@/lib/handoff-url';

describe('handoff-url', () => {
  it('preserves checkin/checkout/guests in hotel links', () => {
    const params = new URLSearchParams('checkin=2026-06-01&checkout=2026-06-03&guests=2');
    const result = preserveSearchParams(params, '/hotel/test');
    expect(result).toBe('/hotel/test?checkin=2026-06-01&checkout=2026-06-03&guests=2');
  });

  it('strips non-relevant params like scroll and showRoom', () => {
    const params = new URLSearchParams('checkin=2026-06-01&scroll=123&showRoom=abc');
    const result = preserveSearchParams(params, '/hotel/test');
    expect(result).toContain('checkin=2026-06-01');
    expect(result).not.toContain('scroll=123');
    expect(result).not.toContain('showRoom=abc');
  });

  it('returns clean path when no relevant params', () => {
    const params = new URLSearchParams('scroll=123&foo=bar');
    const result = preserveSearchParams(params, '/hotel/test');
    expect(result).toBe('/hotel/test');
  });

  it('handles empty params', () => {
    const params = new URLSearchParams('');
    const result = preserveSearchParams(params, '/hotel/test');
    expect(result).toBe('/hotel/test');
  });

  it('preserves only the defined relevant params', () => {
    const params = new URLSearchParams('checkin=2026-06-01&checkout=2026-06-03&guests=2&category=glamping&max_price=200000&location=Medellín');
    const result = preserveSearchParams(params, '/hotel/test');
    // All of these are in RELEVANT_PARAMS and should be preserved
    expect(result).toContain('checkin=2026-06-01');
    expect(result).toContain('checkout=2026-06-03');
    expect(result).toContain('guests=2');
    expect(result).toContain('category=glamping');
    expect(result).toContain('max_price=200000');
    expect(result).toContain('location=Medell'); // URL-encoded: Medellín → Medell%C3%ADn
    // These are NOT relevant and should be stripped
    expect(result).not.toContain('scroll=');
    expect(result).not.toContain('showRoom=');
  });
});
