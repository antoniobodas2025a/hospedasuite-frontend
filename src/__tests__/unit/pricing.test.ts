// ============================================================================
// 🧪 Tests Unitarios: calculateStayPrice()
//
// Función pura — no necesita DB, no necesita setup.
// Calcula el precio de estadía considerando tarifas de fin de semana.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { calculateStayPrice } from '@/utils/supabase/pricing';

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
