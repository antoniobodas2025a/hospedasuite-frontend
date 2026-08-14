import { describe, it, expect } from 'vitest';
import {
  calculatePriceBreakdown,
  type PriceBreakdown,
} from '@/components/dashboard/price-calculator-logic';

describe('dashboard price calculator logic', () => {
  it('returns basePrice equal to total with no tax fields', () => {
    const result = calculatePriceBreakdown(300000);

    expect(result).toMatchObject({
      basePrice: 300000,
      total: 300000,
    } as PriceBreakdown);
    expect(result.total).toBe(result.basePrice);
    expect(result).not.toHaveProperty('iva');
    expect(result).not.toHaveProperty('guestSees');
  });

  it('returns zero totals for a zero base price', () => {
    const result = calculatePriceBreakdown(0);

    expect(result.basePrice).toBe(0);
    expect(result.total).toBe(0);
  });

  it('keeps fee calculations independent of tax', () => {
    const result = calculatePriceBreakdown(100000);

    expect(result.wompiFee).toBeGreaterThan(0);
    expect(result.platformFee).toBeGreaterThan(0);
    expect(result.retencion).toBeGreaterThan(0);
    expect(result.hotelReceives).toBeLessThan(result.basePrice);
  });
});
