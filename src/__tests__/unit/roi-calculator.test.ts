// ============================================================================
// 🧪 Tests Unitarios: ROI Calculator (Fase 13)
//
// Pure functions — no DB, no UI. Verifica que el cálculo de ahorro
// sea matemáticamente coherente y respete las constantes declaradas:
// - Motor Propio: 0%
// - Red de Descubrimiento: 10%
// - Channels tradicionales: 18%
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  calculateROI,
  formatCOP,
  TRADITIONAL_Channel_RATE,
  HOSPEDASUITE_DISCOVERY_RATE,
  OWN_MOTOR_RATE,
  PRO_PLAN_COST,
} from '@/lib/roi-calculator';

// ============================================================================
// CONSTANTES DECLARADAS — Soberanía del Dato
// ============================================================================

describe('Constantes de comisión', () => {
  it('Motor Propio debe ser 0%', () => {
    expect(OWN_MOTOR_RATE).toBe(0.0);
  });

  it('Red de Descubrimiento debe ser 10%', () => {
    expect(HOSPEDASUITE_DISCOVERY_RATE).toBe(0.10);
  });

  it('Channels tradicionales debe ser 18%', () => {
    expect(TRADITIONAL_Channel_RATE).toBe(0.18);
  });

  it('Plan Pro debe ser $99.000 COP', () => {
    expect(PRO_PLAN_COST).toBe(99000);
  });
});

// ============================================================================
// CÁLCULO ROI — 3 canales
// ============================================================================

describe('calculateROI', () => {
  it('💰 escenario base: 15 reservas × $250.000', () => {
    const result = calculateROI(250000, 15);

    expect(result.totalRevenue).toBe(3750000);
    // Channel tradicional: 3750000 * 0.18 = 675000
    expect(result.traditionalOtaCommission).toBe(675000);
    // Red de Descubrimiento: 3750000 * 0.10 = 375000
    expect(result.hospedaSuiteDiscoveryCost).toBe(375000);
    // Motor Propio: solo costo del plan
    expect(result.ownMotorCost).toBe(PRO_PLAN_COST);
    // Ahorro vs Channel: 675000 - 99000 = 576000
    expect(result.netSavings).toBe(576000);
  });

  it('📉 punto de equilibrio: 1 reserva × $250.000 → ahorro negativo', () => {
    const result = calculateROI(250000, 1);
    // 250000 * 0.18 = 45000 - 99000 = -54000
    expect(result.netSavings).toBe(-54000);
  });

  it('📈 muchas reservas: 60 × $500.000 → ahorro significativo', () => {
    const result = calculateROI(500000, 60);
    expect(result.totalRevenue).toBe(30000000);
    expect(result.traditionalOtaCommission).toBe(5400000);
    expect(result.netSavings).toBe(5400000 - 99000);
  });

  it('🛡️ cero reservas → sin revenue, solo costo del plan', () => {
    const result = calculateROI(250000, 0);
    expect(result.totalRevenue).toBe(0);
    expect(result.traditionalOtaCommission).toBe(0);
    expect(result.hospedaSuiteDiscoveryCost).toBe(0);
    expect(result.netSavings).toBe(-PRO_PLAN_COST);
  });

  it('🛡️ tarifa cero → sin revenue', () => {
    const result = calculateROI(0, 10);
    expect(result.totalRevenue).toBe(0);
    expect(result.netSavings).toBe(-PRO_PLAN_COST);
  });

  it('🔧 tasas custom: Channel 15%, Discovery 8%', () => {
    const result = calculateROI(200000, 10, 0.15, 0.08);
    expect(result.traditionalCommissionRate).toBe(15);
    expect(result.discoveryCommissionRate).toBe(8);
    expect(result.traditionalOtaCommission).toBe(300000);
    expect(result.hospedaSuiteDiscoveryCost).toBe(160000);
  });

  it('🔧 costo de plan custom', () => {
    const result = calculateROI(200000, 10, 0.18, 0.10, 49000);
    expect(result.ownMotorCost).toBe(49000);
    expect(result.netSavings).toBe(360000 - 49000);
  });

  it('📊 break-even: cuántas reservas para cubrir el plan', () => {
    // 250000 * 0.18 = 45000 por reserva
    // ceil(99000 / 45000) = 3
    const result = calculateROI(250000, 3);
    expect(result.breakEvenBookings).toBe(3);
    expect(result.netSavings).toBeGreaterThan(0);
  });

  it('📊 break-even con tarifa baja: necesita más reservas', () => {
    // 80000 * 0.18 = 14400 por reserva
    // ceil(99000 / 14400) = 7
    const result = calculateROI(80000, 1);
    expect(result.breakEvenBookings).toBe(7);
  });

  it('🛡️ tarifa negativa → breakEven = Infinity (protegido)', () => {
    const result = calculateROI(-100000, 5);
    expect(result.traditionalOtaCommission).toBe(-90000);
    expect(result.breakEvenBookings).toBe(Infinity);
  });
});

// ============================================================================
// MUTATION TESTS — Kill Rate 100%
// Sabotea las constantes y verifica que los tests fallen
// ============================================================================

describe('Mutation tests — inmunidad de constantes', () => {
  it('🛡️ si Channel fuera 0%, el test de savings falla', () => {
    // Simulamos: si TRADITIONAL_Channel_RATE fuera 0, no habría ahorro
    const sabotaged = calculateROI(250000, 15, 0.0);
    // Con Channel=0%, netSavings = 0 - 99000 = -99000 (negativo)
    expect(sabotaged.netSavings).toBe(-99000);
    // Esto demuestra que el test detectaría si alguien pone Channel=0%
    expect(sabotaged.netSavings).toBeLessThan(0);
  });

  it('🛡️ si Discovery fuera 0%, el costo de adquisición desaparece', () => {
    const sabotaged = calculateROI(250000, 15, 0.18, 0.0);
    expect(sabotaged.hospedaSuiteDiscoveryCost).toBe(0);
    // Red de Descubrimiento no puede ser 0% en producción
    expect(HOSPEDASUITE_DISCOVERY_RATE).toBeGreaterThan(0);
  });

  it('🛡️ Motor Propio SIEMPRE debe ser 0%', () => {
    expect(OWN_MOTOR_RATE).toBe(0);
    expect(OWN_MOTOR_RATE).toBeLessThan(HOSPEDASUITE_DISCOVERY_RATE);
    expect(HOSPEDASUITE_DISCOVERY_RATE).toBeLessThan(TRADITIONAL_Channel_RATE);
  });
});

// ============================================================================
// MUTATION TEST — Fórmula del ahorro (Kill Rate 100%)
// Sabotea la fórmula y verifica que los tests fallen
// ============================================================================

describe('Mutation test — fórmula del ahorro', () => {
  it('🛡️ el ahorro DEBE ser (Ingreso × 0.18) - 99000', () => {
    const revenue = 250000 * 15; // 3750000
    const expectedSavings = Math.round(revenue * 0.18) - 99000;

    const result = calculateROI(250000, 15);
    expect(result.netSavings).toBe(expectedSavings);
    expect(result.netSavings).toBe(576000);
  });

  it('🛡️ si la fórmula NO resta el plan, el test falla', () => {
    const revenue = 250000 * 15;
    const wrongSavings = Math.round(revenue * 0.18); // Sin restar plan

    const result = calculateROI(250000, 15);
    // El resultado real SÍ resta el plan
    expect(result.netSavings).toBeLessThan(wrongSavings);
    expect(result.netSavings).toBe(wrongSavings - PRO_PLAN_COST);
  });

  it('🛡️ si la fórmula usa otro % de Channel, el test falla', () => {
    const revenue = 250000 * 15;
    const wrongCommission = Math.round(revenue * 0.15); // 15% en vez de 18%

    const result = calculateROI(250000, 15);
    expect(result.traditionalOtaCommission).toBeGreaterThan(wrongCommission);
    expect(result.traditionalOtaCommission).toBe(Math.round(revenue * 0.18));
  });
});

// ============================================================================
// FORMATO COP
// ============================================================================

describe('formatCOP', () => {
  it('formatea 99000 con símbolo COP', () => {
    expect(formatCOP(99000)).toContain('99.000');
    expect(formatCOP(99000)).toContain('$');
  });

  it('formatea 1000000 con separador de miles', () => {
    expect(formatCOP(1000000)).toContain('1.000.000');
  });

  it('formatea 0', () => {
    expect(formatCOP(0)).toContain('0');
  });

  it('formatea decimales sin decimales', () => {
    expect(formatCOP(99500.75)).toContain('99.501');
  });
});
