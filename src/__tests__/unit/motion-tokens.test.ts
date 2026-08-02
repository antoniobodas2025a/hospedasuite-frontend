import { describe, it, expect } from 'vitest';
import { MOTION_DURATION, MOTION_EASING, MOTION_STAGGER } from '@/lib/motion-tokens';

describe('motion-tokens', () => {
  it('exports duration constants for fast, normal and slow', () => {
    expect(MOTION_DURATION.fast).toBe(150);
    expect(MOTION_DURATION.normal).toBe(200);
    expect(MOTION_DURATION.slow).toBe(300);
  });

  it('exports easing constants', () => {
    expect(MOTION_EASING.easeOut).toBe('cubic-bezier(0, 0, 0.2, 1)');
    expect(MOTION_EASING.easeInOut).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
  });

  it('exports card stagger delay', () => {
    expect(MOTION_STAGGER.card).toBe(50);
  });
});
