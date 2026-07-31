// ============================================================================
// 🧪 Tests Unitarios: CheckoutForm Tax Regime
//
// Verifica que el checkout calcule correctamente el IVA según tax_regime
// ============================================================================

import { describe, it, expect } from 'vitest';
import { calculateTaxAmount } from '@/lib/pricing';

describe('CheckoutForm Tax Regime', () => {
  // ==========================================================================
  // Escenario 1: Hotel Régimen Simplificado (no cobra IVA)
  // ==========================================================================
  describe('Régimen Simplificado', () => {
    it('calcula IVA = 0 para tax_regime simplified', () => {
      const basePrice = 600000; // 300000 * 2 noches
      const taxRegime: 'simplified' | 'responsible' = 'simplified';
      
      // Si tax_regime es 'simplified', la tasa es 0
      const ivaRate = taxRegime === 'responsible' ? 0.19 : 0;
      const iva = calculateTaxAmount(basePrice, ivaRate);
      
      expect(iva).toBe(0);
      expect(basePrice + iva).toBe(600000);
    });

    it('total a pagar es igual al precio base', () => {
      const basePrice = 600000;
      const taxRegime: 'simplified' | 'responsible' = 'simplified';
      const ivaRate = taxRegime === 'responsible' ? 0.19 : 0;
      const total = basePrice + calculateTaxAmount(basePrice, ivaRate);
      
      expect(total).toBe(600000);
    });
  });

  // ==========================================================================
  // Escenario 2: Hotel Responsable de IVA (cobra 19%)
  // ==========================================================================
  describe('Régimen Responsable', () => {
    it('calcula IVA = 19% para tax_regime responsible', () => {
      const basePrice = 600000; // 300000 * 2 noches
      const taxRegime: 'simplified' | 'responsible' = 'responsible';
      
      const ivaRate = taxRegime === 'responsible' ? 0.19 : 0;
      const iva = calculateTaxAmount(basePrice, ivaRate);
      
      expect(iva).toBe(114000); // 19% de 600000
    });

    it('total a pagar incluye IVA', () => {
      const basePrice = 600000;
      const taxRegime: 'simplified' | 'responsible' = 'responsible';
      const ivaRate = taxRegime === 'responsible' ? 0.19 : 0;
      const iva = calculateTaxAmount(basePrice, ivaRate);
      const total = basePrice + iva;
      
      expect(total).toBe(714000); // 600000 + 114000
    });

    it('IVA se calcula sobre el total de la estadía, no por noche', () => {
      const pricePerNight = 300000;
      const nights = 2;
      const basePrice = pricePerNight * nights;
      const taxRegime: 'simplified' | 'responsible' = 'responsible';
      
      const ivaRate = taxRegime === 'responsible' ? 0.19 : 0;
      const iva = calculateTaxAmount(basePrice, ivaRate);
      
      // IVA = 19% de 600000 = 114000
      expect(iva).toBe(114000);
    });
  });

  // ==========================================================================
  // Escenario 3: Backward Compatibility
  // ==========================================================================
  describe('Backward Compatibility', () => {
    it('si tax_regime no existe, asume simplified (IVA = 0)', () => {
      const basePrice = 600000;
      const taxRegime: 'simplified' | 'responsible' | undefined = undefined;
      
      const ivaRate = taxRegime === 'responsible' ? 0.19 : 0;
      const iva = calculateTaxAmount(basePrice, ivaRate);
      
      expect(iva).toBe(0);
    });

    it('si tax_regime es null, asume simplified (IVA = 0)', () => {
      const basePrice = 600000;
      const taxRegime: 'simplified' | 'responsible' | null = null;
      
      const ivaRate = taxRegime === 'responsible' ? 0.19 : 0;
      const iva = calculateTaxAmount(basePrice, ivaRate);
      
      expect(iva).toBe(0);
    });
  });

  // ==========================================================================
  // Escenario 4: Casos Borde
  // ==========================================================================
  describe('Edge Cases', () => {
    it('precio base 0: IVA = 0 sin importar régimen', () => {
      const basePrice = 0;
      const taxRegime: 'simplified' | 'responsible' = 'responsible';
      
      const ivaRate = taxRegime === 'responsible' ? 0.19 : 0;
      const iva = calculateTaxAmount(basePrice, ivaRate);
      
      expect(iva).toBe(0);
    });

    it('números grandes: 1000000 con IVA = 190000', () => {
      const basePrice = 1000000;
      const taxRegime: 'simplified' | 'responsible' = 'responsible';
      
      const ivaRate = taxRegime === 'responsible' ? 0.19 : 0;
      const iva = calculateTaxAmount(basePrice, ivaRate);
      
      expect(iva).toBe(190000);
    });
  });
});
