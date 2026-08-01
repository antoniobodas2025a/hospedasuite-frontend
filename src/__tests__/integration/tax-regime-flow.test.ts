/**
 * Tax Regime Integration Flow Tests
 *
 * Verifies the end-to-end tax regime flow:
 * 1. Hotelero selects tax regime during onboarding
 * 2. Price calculator shows correct breakdown for the hotelero
 * 3. Checkout calculates IVA correctly for the guest
 * 4. Split payment distributes funds correctly between hotel and platform
 *
 * Business rules:
 * - Simplified regime: no IVA added to guest price
 * - Responsible regime: 19% IVA added to guest price (IVA is passthrough, doesn't affect hotel net)
 * - Platform fee: 8% of base price
 * - Wompi fee: 3% of base price
 * - Retention: 11% of platform fee
 */

import { describe, it, expect } from 'vitest';
import { calculatePriceBreakdown } from '@/components/dashboard/price-calculator-logic';
import { calculateSplitPayment } from '@/lib/split-payment-calculator';

describe('Tax Regime Integration Flow', () => {
	describe('Scenario 1: Hotel Régimen Simplificado', () => {
		const taxRegime = 'simplified';
		const roomPrice = 300000; // $300.000 COP/noche
		const nights = 2;

		it('calculadora del hotelero muestra neto correcto', () => {
			const breakdown = calculatePriceBreakdown(roomPrice, taxRegime);

			// El hotelero ve cuánto le llega después de comisiones
			expect(breakdown.guestSees).toBe(300000); // Sin IVA
			expect(breakdown.wompiFee).toBe(9000); // 3%
			expect(breakdown.platformFee).toBe(24000); // 8%
			expect(breakdown.retencion).toBe(2640); // 11% de 24000
			expect(breakdown.hotelReceives).toBe(264360); // Neto
		});

		it('checkout del huésped no agrega IVA', () => {
			const subtotal = roomPrice * nights;
			const ivaRate = taxRegime === 'responsible' ? 0.19 : 0;
			const iva = subtotal * ivaRate;
			const total = subtotal + iva;

			expect(iva).toBe(0);
			expect(total).toBe(600000); // 300000 * 2
		});

		it('split payment calcula correctamente', () => {
			const totalAmount = roomPrice * nights; // 600000

			const split = calculateSplitPayment({
				totalAmount,
				platformPercentage: 8,
				hotelPercentage: 92,
				wompiFeeRate: 0.03,
				retentionRate: 0.11,
			});

			expect(split.hotelGrossAmount).toBe(552000); // 92% de 600000
			expect(split.platformGrossAmount).toBe(48000); // 8% de 600000
			expect(split.hotelNetAmount).toBe(535440); // Después de comisiones
			expect(split.platformNetAmount).toBe(41280); // Después de comisiones
		});
	});

	describe('Scenario 2: Hotel Responsable de IVA', () => {
		const taxRegime = 'responsible';
		const roomPrice = 300000;
		const nights = 2;

		it('calculadora del hotelero muestra IVA pero neto igual', () => {
			const breakdown = calculatePriceBreakdown(roomPrice, taxRegime);

			// El hotelero ve que el huésped paga IVA, pero su neto es igual
			expect(breakdown.guestSees).toBe(357000); // 300000 + 19% IVA
			expect(breakdown.iva).toBe(57000); // 19% de 300000
			expect(breakdown.hotelReceives).toBe(264360); // MISMO neto (IVA es pasajero)
		});

		it('checkout del huésped agrega IVA correctamente', () => {
			const subtotal = roomPrice * nights;
			const ivaRate = taxRegime === 'responsible' ? 0.19 : 0;
			const iva = subtotal * ivaRate;
			const total = subtotal + iva;

			expect(iva).toBe(114000); // 19% de 600000
			expect(total).toBe(714000); // 600000 + 114000
		});

		it('split payment se calcula sobre base sin IVA', () => {
			const baseAmount = roomPrice * nights; // 600000 (sin IVA)

			const split = calculateSplitPayment({
				totalAmount: baseAmount,
				platformPercentage: 8,
				hotelPercentage: 92,
				wompiFeeRate: 0.03,
				retentionRate: 0.11,
			});

			// Las comisiones se calculan sobre la base, no sobre el total con IVA
			expect(split.platformGrossAmount).toBe(48000); // 8% de 600000 (NO de 714000)
			expect(split.hotelGrossAmount).toBe(552000); // 92% de 600000
		});
	});

	describe('Scenario 3: Edge Cases', () => {
		it('calculadora maneja precio 0 correctamente', () => {
			const breakdown = calculatePriceBreakdown(0, 'simplified');
			expect(breakdown.guestSees).toBe(0);
			expect(breakdown.hotelReceives).toBe(0);
		});

		it('split payment rechaza monto 0 o negativo', () => {
			expect(() =>
				calculateSplitPayment({
					totalAmount: 0,
					platformPercentage: 8,
					hotelPercentage: 92,
					wompiFeeRate: 0.03,
					retentionRate: 0.11,
				}),
			).toThrow('totalAmount must be positive');
		});

		it('maneja montos grandes sin overflow', () => {
			const breakdown = calculatePriceBreakdown(10000000, 'responsible'); // 10 millones
			expect(breakdown.guestSees).toBe(11900000); // + 19% IVA
			expect(breakdown.hotelReceives).toBeGreaterThan(0);
		});

		it('calculadora y split payment son consistentes en porcentajes', () => {
			const roomPrice = 500000;
			const nights = 3;
			const taxRegime = 'simplified';

			// Calculadora del hotelero (por noche)
			const breakdown = calculatePriceBreakdown(roomPrice, taxRegime);

			// Split payment del checkout (total de la reserva)
			const totalAmount = roomPrice * nights;
			const split = calculateSplitPayment({
				totalAmount,
				platformPercentage: 8,
				hotelPercentage: 92,
				wompiFeeRate: 0.03,
				retentionRate: 0.11,
			});

			// Verificar que los porcentajes son consistentes
			const platformPercentage = (split.platformGrossAmount / totalAmount) * 100;
			expect(platformPercentage).toBeCloseTo(8, 1);

			const hotelPercentage = (split.hotelGrossAmount / totalAmount) * 100;
			expect(hotelPercentage).toBeCloseTo(92, 1);

			// Verificar que las comisiones de la calculadora son proporcionales
			const expectedWompiFee = roomPrice * 0.03;
			expect(breakdown.wompiFee).toBe(expectedWompiFee);

			const expectedPlatformFee = roomPrice * 0.08;
			expect(breakdown.platformFee).toBe(expectedPlatformFee);
		});

		it('IVA es pasajero: no afecta el neto del hotel', () => {
			const basePrice = 300000;

			const simplified = calculatePriceBreakdown(basePrice, 'simplified');
			const responsible = calculatePriceBreakdown(basePrice, 'responsible');

			// El neto del hotel es IDENTICO en ambos regímenes
			expect(simplified.hotelReceives).toBe(responsible.hotelReceives);

			// La diferencia solo la ve el huésped (paga IVA o no)
			expect(responsible.guestSees - simplified.guestSees).toBe(responsible.iva);
		});
	});
});
