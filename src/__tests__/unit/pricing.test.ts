// ============================================================================
// 🧪 Tests Unitarios: calculateStayPrice()
//
// Función pura — no necesita DB, no necesita setup.
// Calcula el precio de estadía considerando tarifas de fin de semana.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { calculateStayPrice } from '@/utils/supabase/pricing';
import {
  calculateTaxAmount,
  calculateTotalWithTax,
  calculatePrice,
  DEFAULT_TAX_RATE,
} from '@/lib/pricing';

describe('calculateStayPrice', () => {
  // ==========================================================================
  // Semana de referencia: Mayo 2026
  // Lun 4, Mar 5, Mié 6, Jue 7, Vie 8, Sáb 9, Dom 10
  // ==========================================================================

  it('💰 estadía entre semana (lun→mié): solo weekday', () => {
    const result = calculateStayPrice('2026-05-04', '2026-05-06', 100);

    expect(result).toEqual({
      totalPrice: 200,      // 2 noches × $100
      totalNights: 2,
      weekendNights: 0,
      weekdayNights: 2,
    });
  });

  it('💰 estadía que CRUZA fin de semana (jue→dom): weekday + weekend', () => {
    const result = calculateStayPrice('2026-05-07', '2026-05-10', 100, 150);

    expect(result).toEqual({
      totalPrice: 400,      // jue(100) + vie(150) + sáb(150)
      totalNights: 3,
      weekendNights: 2,      // viernes + sábado
      weekdayNights: 1,      // jueves
    });
  });

  it('💰 estadía SOLO fin de semana (vie→dom): solo weekend', () => {
    const result = calculateStayPrice('2026-05-08', '2026-05-10', 100, 150);

    expect(result).toEqual({
      totalPrice: 300,      // vie(150) + sáb(150)
      totalNights: 2,
      weekendNights: 2,
      weekdayNights: 0,
    });
  });

  it('💰 sin weekendPrice configurado: usa basePrice para todo', () => {
    const result = calculateStayPrice('2026-05-08', '2026-05-10', 100);

    expect(result).toEqual({
      totalPrice: 200,      // vie(100) + sáb(100) — sin weekend rate
      totalNights: 2,
      weekendNights: 2,
      weekdayNights: 0,
    });
  });

  it('🛡️ fechas inválidas → total 0', () => {
    const result = calculateStayPrice('no-valido', '2026-05-10', 100);
    expect(result.totalPrice).toBe(0);
    expect(result.totalNights).toBe(0);
  });

  it('🛡️ checkOut antes que checkIn → total 0', () => {
    const result = calculateStayPrice('2026-05-10', '2026-05-08', 100);
    expect(result.totalPrice).toBe(0);
    expect(result.totalNights).toBe(0);
  });

  it('🛡️ misma fecha checkIn/checkOut (0 noches) → total 0', () => {
    const result = calculateStayPrice('2026-05-08', '2026-05-08', 100);
    expect(result.totalPrice).toBe(0);
    expect(result.totalNights).toBe(0);
  });
});

// ============================================================================
// 🧪 Tests Unitarios: calculateTaxAmount, calculateTotalWithTax, calculatePrice
//
// Pure functions from src/lib/pricing.ts — no DB, no setup.
// Verifies tax calculations, default fallback, edge cases.
// ============================================================================

describe('DEFAULT_TAX_RATE', () => {
  it('debe ser 0.19 (19%)', () => {
    expect(DEFAULT_TAX_RATE).toBe(0.19);
  });
});

describe('calculateTaxAmount', () => {
  it('con taxRate 0.19: 100000 → 19000', () => {
    expect(calculateTaxAmount(100000, 0.19)).toBe(19000);
  });

  it('con taxRate 0 (simplificado): 100000 → 0', () => {
    expect(calculateTaxAmount(100000, 0)).toBe(0);
  });

  it('con taxRate undefined: usa DEFAULT_TAX_RATE (0.19)', () => {
    expect(calculateTaxAmount(100000)).toBe(19000);
  });

  it('con taxRate undefined y precio cero: retorna 0', () => {
    expect(calculateTaxAmount(0)).toBe(0);
    expect(calculateTaxAmount(0, 0.19)).toBe(0);
  });

  it('con números grandes: 1000000 * 0.19 = 190000', () => {
    expect(calculateTaxAmount(1000000, 0.19)).toBe(190000);
  });

  it('con precisión decimal: Math.round aplicado', () => {
    // 33333 * 0.19 = 6333.27 → 6333
    expect(calculateTaxAmount(33333, 0.19)).toBe(6333);
    // 33334 * 0.19 = 6333.46 → 6333
    expect(calculateTaxAmount(33334, 0.19)).toBe(6333);
    // 33335 * 0.19 = 6333.65 → 6334
    expect(calculateTaxAmount(33335, 0.19)).toBe(6334);
  });

  it('con basePrice 0: siempre retorna 0', () => {
    expect(calculateTaxAmount(0, 0)).toBe(0);
    expect(calculateTaxAmount(0, 0.19)).toBe(0);
    expect(calculateTaxAmount(0)).toBe(0);
  });
});

describe('calculateTotalWithTax', () => {
  it('con taxRate 0.19: 100000 → total=119000', () => {
    const result = calculateTotalWithTax(100000, 0.19);
    expect(result.total).toBe(119000);
    expect(result.hasTax).toBe(true);
  });

  it('con taxRate 0 (simplificado): 100000 → total=100000', () => {
    const result = calculateTotalWithTax(100000, 0);
    expect(result.total).toBe(100000);
    expect(result.hasTax).toBe(false);
  });

  it('con taxRate undefined: usa DEFAULT_TAX_RATE (0.19)', () => {
    const result = calculateTotalWithTax(100000);
    expect(result.total).toBe(119000);
  });

  it('con números grandes: 1000000 * 1.19 = 1190000', () => {
    const result = calculateTotalWithTax(1000000, 0.19);
    expect(result.total).toBe(1190000);
  });

  it('con basePrice 0: siempre retorna 0', () => {
    expect(calculateTotalWithTax(0, 0).total).toBe(0);
    expect(calculateTotalWithTax(0, 0.19).total).toBe(0);
    expect(calculateTotalWithTax(0).total).toBe(0);
  });
});

describe('calculatePrice', () => {
  it('3 noches con IVA 19%: subtotal=300000, tax=57000, total=357000, hasTax=true', () => {
    const result = calculatePrice(100000, 3, 0.19);
    expect(result).toEqual({
      subtotal: 300000,
      tax: 57000,
      total: 357000,
      hasTax: true,
    });
  });

  it('3 noches sin IVA (régimen simplificado): subtotal=total=300000, tax=0, hasTax=false', () => {
    const result = calculatePrice(100000, 3, 0);
    expect(result).toEqual({
      subtotal: 300000,
      tax: 0,
      total: 300000,
      hasTax: false,
    });
  });

  it('con taxRate undefined: usa DEFAULT_TAX_RATE, hasTax=true', () => {
    const result = calculatePrice(100000, 1);
    expect(result.total).toBe(119000);
    expect(result.tax).toBe(19000);
    expect(result.hasTax).toBe(true);
  });

  it('1 noche: subtotal = basePrice', () => {
    const result = calculatePrice(150000, 1, 0.19);
    expect(result.subtotal).toBe(150000);
    expect(result.total).toBe(178500);
  });

  it('0 noches (caso borde): todo cero', () => {
    const result = calculatePrice(100000, 0, 0.19);
    expect(result.subtotal).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(0);
  });
});

// ============================================================================
// 🧪 Escenarios de Verificación Adaptativa (Phase 5)
//
// Simula el comportamiento de createPendingBookingAction para validar
// que el buffer se adapta correctamente al tax_rate del hotel.
// ============================================================================

describe('Adaptive verification buffer', () => {
  function maxExpected(basePrice: number, nights: number, taxRate?: number): number {
    const baseRate = basePrice * nights;
    const rate = taxRate ?? DEFAULT_TAX_RATE;
    return Math.round(baseRate * (1 + rate) * 1.05);
  }

  function minExpected(basePrice: number, nights: number): number {
    return Math.round(basePrice * nights * 0.95);
  }

  it('con tax_rate=0.19: buffer ≈ 1.25x baseRate', () => {
    // baseRate = 100000 * 3 = 300000
    // maxExpected = 300000 * 1.19 * 1.05 = 374850
    expect(maxExpected(100000, 3, 0.19)).toBe(374850);
    expect(minExpected(100000, 3)).toBe(285000);
  });

  it('con tax_rate=0: buffer = 1.05x baseRate', () => {
    // baseRate = 100000 * 3 = 300000
    // maxExpected = 300000 * 1.00 * 1.05 = 315000
    expect(maxExpected(100000, 3, 0)).toBe(315000);
    expect(minExpected(100000, 3)).toBe(285000);
  });

  it('con tax_rate=undefined (NULL en DB): default 0.19', () => {
    // Mismo comportamiento que tax_rate=0.19
    expect(maxExpected(100000, 3)).toBe(374850);
  });

  it('una noche con IVA: acepta el monto justo con IVA', () => {
    const montoCliente = calculateTotalWithTax(100000, 0.19).total; // 119000
    expect(montoCliente).toBeLessThanOrEqual(maxExpected(100000, 1, 0.19));
    expect(montoCliente).toBeGreaterThanOrEqual(minExpected(100000, 1));
  });

  it('una noche sin IVA: acepta el monto justo', () => {
    const montoCliente = calculateTotalWithTax(100000, 0).total; // 100000
    expect(montoCliente).toBeLessThanOrEqual(maxExpected(100000, 1, 0));
    expect(montoCliente).toBeGreaterThanOrEqual(minExpected(100000, 1));
  });
});
