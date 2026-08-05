import { describe, it, expect } from 'vitest';
import { isWeekend, calculateNights, detectIntent, validateAndParseDates } from '@/domain/room-availability';

describe('isWeekend', () => {
  it('returns true for Friday', () => {
    expect(isWeekend(new Date('2026-08-07T00:00:00Z'))).toBe(true);
  });

  it('returns true for Saturday', () => {
    expect(isWeekend(new Date('2026-08-08T00:00:00Z'))).toBe(true);
  });

  it('returns false for Sunday', () => {
    expect(isWeekend(new Date('2026-08-09T00:00:00Z'))).toBe(false);
  });

  it('returns false for Wednesday', () => {
    expect(isWeekend(new Date('2026-08-05T00:00:00Z'))).toBe(false);
  });
});

describe('calculateNights', () => {
  it('returns 3 for a three-night stay', () => {
    expect(calculateNights(new Date('2026-08-05T00:00:00Z'), new Date('2026-08-08T00:00:00Z'))).toBe(3);
  });

  it('returns 1 for a single-night stay', () => {
    expect(calculateNights(new Date('2026-08-05T00:00:00Z'), new Date('2026-08-06T00:00:00Z'))).toBe(1);
  });

  it('returns 0 for same-day check-in and check-out', () => {
    expect(calculateNights(new Date('2026-08-05T00:00:00Z'), new Date('2026-08-05T00:00:00Z'))).toBe(0);
  });

  it('returns a negative value when check-out is before check-in', () => {
    expect(calculateNights(new Date('2026-08-08T00:00:00Z'), new Date('2026-08-05T00:00:00Z'))).toBe(-3);
  });
});

describe('detectIntent', () => {
  it('detects long stay when five or more nights', () => {
    expect(detectIntent(new Date('2026-08-05T00:00:00Z'), new Date('2026-08-10T00:00:00Z'))).toBe('long_stay');
  });

  it('detects weekend intent when range includes a weekend night', () => {
    expect(detectIntent(new Date('2026-08-07T00:00:00Z'), new Date('2026-08-09T00:00:00Z'))).toBe('weekend');
  });

  it('detects weekday intent for monday-to-thursday stay', () => {
    expect(detectIntent(new Date('2026-08-03T00:00:00Z'), new Date('2026-08-06T00:00:00Z'))).toBe('weekday');
  });

  it('returns any for zero-night or invalid range', () => {
    expect(detectIntent(new Date('2026-08-05T00:00:00Z'), new Date('2026-08-05T00:00:00Z'))).toBe('any');
    expect(detectIntent(new Date('2026-08-08T00:00:00Z'), new Date('2026-08-05T00:00:00Z'))).toBe('any');
  });
});

describe('validateAndParseDates', () => {
  it('returns parsed dates for valid future ISO range', () => {
    const result = validateAndParseDates('2026-09-10', '2026-09-13');
    expect(result).not.toBeNull();
    expect(result?.checkIn.toISOString()).toBe('2026-09-10T12:00:00.000Z');
    expect(result?.checkOut.toISOString()).toBe('2026-09-13T12:00:00.000Z');
  });

  it('returns null when a parameter is missing', () => {
    expect(validateAndParseDates('2026-09-10', null)).toBeNull();
    expect(validateAndParseDates(undefined, '2026-09-13')).toBeNull();
  });

  it('returns null for non-ISO date strings', () => {
    expect(validateAndParseDates('09/10/2026', '2026-09-13')).toBeNull();
    expect(validateAndParseDates('2026-9-10', '2026-09-13')).toBeNull();
  });

  it('returns null when checkout is not after checkin', () => {
    expect(validateAndParseDates('2026-09-13', '2026-09-10')).toBeNull();
    expect(validateAndParseDates('2026-09-10', '2026-09-10')).toBeNull();
  });

  it('returns null when checkout is today or in the past', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(validateAndParseDates(today, today)).toBeNull();
  });
});
