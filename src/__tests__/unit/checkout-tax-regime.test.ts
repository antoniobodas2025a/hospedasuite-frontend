// ============================================================================
// 🧪 Tests Unitarios: Checkout Tax Regime — Modelo FLAT
//
// Verifica que pricing.ts NO expone funciones de impuesto y que el total
// siempre es igual al subtotal (precio final = precio configurado).
// ============================================================================

import { describe, it, expect } from 'vitest';
import * as pricing from '@/lib/pricing';

describe('Checkout Tax Regime (FLAT)', () => {
  it('no exporta calculateTaxAmount (stub legacy removido)', () => {
    expect(pricing).not.toHaveProperty('calculateTaxAmount');
  });

  it('calculatePrice devuelve total igual al subtotal', () => {
    const result = pricing.calculatePrice(300000, 3);

    expect(result.subtotal).toBe(900000);
    expect(result.total).toBe(900000);
  });

  it('buildRoomPricingBreakdown devuelve total igual al subtotal', () => {
    const result = pricing.buildRoomPricingBreakdown({
      pricePerNight: 300000,
      weekendPrice: 360000,
      checkIn: new Date('2026-08-13T12:00:00Z'),
      checkOut: new Date('2026-08-16T12:00:00Z'),
    });

    expect(result.total).toBe(result.subtotal);
    expect(result.total).toBe(300000 + 360000 + 360000);
  });

  it('precio base 0 mantiene total igual al subtotal', () => {
    const result = pricing.calculatePrice(0, 5);

    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
  });
});
