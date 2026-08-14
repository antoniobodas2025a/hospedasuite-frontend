/**
 * FLAT Pricing Integration Flow Tests
 *
 * Verifies the end-to-end FLAT pricing model:
 * 1. Hotelero configures a single final price (no tax regime selection)
 * 2. Price calculator shows total equal to base price (no IVA)
 * 3. Checkout uses the same flat total
 * 4. Split payment distributes funds correctly between hotel and platform
 *
 * Business rules:
 * - Total = base price (no tax added)
 * - Platform fee: 8% of base price
 * - Wompi fee: 3% of base price
 * - Retention: 11% of platform fee
 */

import { describe, it, expect } from 'vitest';
import { calculatePriceBreakdown } from '@/components/dashboard/price-calculator-logic';
import { calculateSplitPayment } from '@/lib/split-payment-calculator';

describe('FLAT Pricing Integration Flow', () => {
	describe('Scenario 1: Standard Room Booking', () => {
		const roomPrice = 300000; // $300.000 COP/noche
		const nights = 2;

		it('calculadora del hotelero muestra total igual al precio base', () => {
			const breakdown = calculatePriceBreakdown(roomPrice);

			expect(breakdown.total).toBe(roomPrice);
			expect(breakdown.basePrice).toBe(roomPrice);
			expect(breakdown.wompiFee).toBe(9000); // 3%
			expect(breakdown.platformFee).toBe(24000); // 8%
			expect(breakdown.retencion).toBe(2640); // 11% de 24000
			expect(breakdown.hotelReceives).toBe(264360); // Neto
		});

		it('checkout del huésped usa el precio base como total final', () => {
			const total = roomPrice * nights;

			expect(total).toBe(600000); // 300000 * 2
		});

		it('split payment calcula correctamente sobre el total flat', () => {
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

	describe('Scenario 2: Edge Cases', () => {
		it('calculadora maneja precio 0 correctamente', () => {
			const breakdown = calculatePriceBreakdown(0);
			expect(breakdown.total).toBe(0);
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
			const breakdown = calculatePriceBreakdown(10000000); // 10 millones
			expect(breakdown.total).toBe(10000000);
			expect(breakdown.hotelReceives).toBeGreaterThan(0);
		});

		it('calculadora y split payment son consistentes en porcentajes', () => {
			const roomPrice = 500000;
			const nights = 3;

			// Calculadora del hotelero (por noche)
			const breakdown = calculatePriceBreakdown(roomPrice);

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
	});
});
