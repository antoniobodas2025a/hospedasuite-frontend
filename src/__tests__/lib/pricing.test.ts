import { describe, it, expect } from 'vitest';
import {
  calculatePrice,
  buildRoomPricingBreakdown,
  formatPrice,
} from '@/lib/pricing';

describe('flat pricing model', () => {
  describe('calculatePrice', () => {
    it('returns subtotal equal to total with no tax fields', () => {
      const result = calculatePrice(300000, 3);

      expect(result).toEqual({ subtotal: 900000, total: 900000 });
      expect(result).not.toHaveProperty('tax');
      expect(result).not.toHaveProperty('hasTax');
      expect(result).not.toHaveProperty('taxLabel');
    });

    it('returns zero for zero nights', () => {
      const result = calculatePrice(300000, 0);

      expect(result).toEqual({ subtotal: 0, total: 0 });
    });

    it('returns base price for a single night', () => {
      const result = calculatePrice(250000, 1);

      expect(result).toEqual({ subtotal: 250000, total: 250000 });
    });
  });

  describe('buildRoomPricingBreakdown', () => {
    it('calculates weekday total without tax', () => {
      const result = buildRoomPricingBreakdown({
        pricePerNight: 300000,
        weekendPrice: 360000,
        checkIn: new Date('2026-08-10'), // Mon
        checkOut: new Date('2026-08-12'), // Wed (2 nights)
      });

      expect(result.subtotal).toBe(600000);
      expect(result.total).toBe(600000);
      expect(result).not.toHaveProperty('tax');
      expect(result).not.toHaveProperty('taxRate');
    });

    it('applies weekend price on Friday and Saturday nights', () => {
      const result = buildRoomPricingBreakdown({
        pricePerNight: 300000,
        weekendPrice: 360000,
        checkIn: new Date('2026-08-14'), // Thu
        checkOut: new Date('2026-08-17'), // Sun (3 nights: Thu, Fri, Sat)
      });

      expect(result.subtotal).toBe(300000 + 360000 + 360000);
      expect(result.total).toBe(result.subtotal);
      expect(result.weekendNights).toBe(2);
      expect(result.weekdayNights).toBe(1);
    });

    it('returns zero totals when checkIn equals checkOut', () => {
      const result = buildRoomPricingBreakdown({
        pricePerNight: 300000,
        weekendPrice: 360000,
        checkIn: new Date('2026-08-14'),
        checkOut: new Date('2026-08-14'),
      });

      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
      expect(result.weekendNights).toBe(0);
      expect(result.weekdayNights).toBe(0);
    });

    it('falls back to weekday price when weekendPrice is zero', () => {
      const result = buildRoomPricingBreakdown({
        pricePerNight: 300000,
        weekendPrice: 0,
        checkIn: new Date('2026-08-14'), // Thu
        checkOut: new Date('2026-08-17'), // Sun
      });

      expect(result.subtotal).toBe(300000 * 3);
      expect(result.total).toBe(result.subtotal);
    });
  });

  describe('formatPrice', () => {
    it('formats a Colombian peso amount', () => {
      expect(formatPrice(300000)).toBe('300.000');
    });
  });
});
