// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { calculatePriceBreakdown, type PriceBreakdown, type TaxRegime } from '../price-calculator-logic';
import { render, screen, fireEvent } from '@testing-library/react';
import PriceCalculator from '../PriceCalculator';

// Mock framer-motion
vi.mock("framer-motion", () => ({
	motion: {
		div: ({ children }: { children?: React.ReactNode }) =>
			React.createElement("div", {}, children),
		button: ({ children }: { children?: React.ReactNode }) =>
			React.createElement("button", {}, children),
	},
}));

describe('calculatePriceBreakdown', () => {
	describe('Régimen Simplificado (sin IVA)', () => {
		it('calcula desglose correcto para $300.000 COP', () => {
			const result = calculatePriceBreakdown(300000, 'simplified');

			expect(result).toEqual({
				guestSees: 300000,        // Sin IVA
				wompiFee: 9000,           // 3% de 300000
				platformFee: 24000,       // 8% de 300000
				iva: 0,                   // No aplica
				retencion: 2640,          // 11% de 24000 (platformFee)
				hotelReceives: 264360,    // 300000 - 9000 - 24000 - 2640
			});
		});

		it('no aplica IVA cuando el régimen es simplified', () => {
			const result = calculatePriceBreakdown(500000, 'simplified');
			expect(result.iva).toBe(0);
			expect(result.guestSees).toBe(500000);
		});
	});

	describe('Responsable de IVA (con IVA 19%)', () => {
		it('calcula desglose correcto para $300.000 COP', () => {
			const result = calculatePriceBreakdown(300000, 'responsible');

			expect(result).toEqual({
				guestSees: 357000,        // 300000 + 19% IVA
				wompiFee: 9000,           // 3% de base (sin IVA)
				platformFee: 24000,       // 8% de base (sin IVA)
				iva: 57000,               // 19% de 300000
				retencion: 2640,          // 11% de 24000 (platformFee)
				hotelReceives: 264360,    // Mismo neto (IVA es pasajero)
			});
		});

		it('aplica IVA 19% al precio que ve el huésped', () => {
			const result = calculatePriceBreakdown(100000, 'responsible');
			expect(result.iva).toBe(19000);
			expect(result.guestSees).toBe(119000);
		});

		it('calcula comisiones sobre precio base sin IVA', () => {
			const result = calculatePriceBreakdown(200000, 'responsible');
			expect(result.wompiFee).toBe(6000);     // 3% de 200000
			expect(result.platformFee).toBe(16000); // 8% de 200000
		});
	});

	describe('Retención en la fuente', () => {
		it('calcula retención 11% sobre comisión de plataforma', () => {
			const result = calculatePriceBreakdown(100000, 'simplified');
			expect(result.platformFee).toBe(8000);  // 8% de 100000
			expect(result.retencion).toBe(880);     // 11% de 8000
		});
	});

	describe('Neto que recibe el hotel', () => {
		it('calcula neto correctamente: base - wompi - platform - retencion', () => {
			const result = calculatePriceBreakdown(100000, 'simplified');
			const expectedNet = 100000 - 3000 - 8000 - 880;
			expect(result.hotelReceives).toBe(expectedNet);
		});

		it('el neto es igual para ambos regímenes (IVA es pasajero)', () => {
			const simplified = calculatePriceBreakdown(300000, 'simplified');
			const responsible = calculatePriceBreakdown(300000, 'responsible');
			expect(simplified.hotelReceives).toBe(responsible.hotelReceives);
		});
	});

	describe('Edge cases', () => {
		it('maneja precio 0 correctamente', () => {
			const result = calculatePriceBreakdown(0, 'simplified');
			expect(result.guestSees).toBe(0);
			expect(result.hotelReceives).toBe(0);
		});

		it('maneja precios decimales', () => {
			const result = calculatePriceBreakdown(99999.99, 'simplified');
			expect(result.guestSees).toBeCloseTo(99999.99, 2);
		});

		it('maneja precios muy grandes', () => {
			const result = calculatePriceBreakdown(10000000, 'responsible');
			expect(result.iva).toBe(1900000);
			expect(result.guestSees).toBe(11900000);
		});
	});
});

describe('PriceCalculator Component', () => {
	it('renderiza el título de la calculadora', () => {
		render(<PriceCalculator />);
		expect(screen.getByText(/Calculadora de Precios/i)).toBeInTheDocument();
	});

	it('muestra el input para precio base', () => {
		render(<PriceCalculator />);
		const input = screen.getByPlaceholderText(/300000/i);
		expect(input).toBeInTheDocument();
	});

	it('muestra el selector de régimen fiscal', () => {
		render(<PriceCalculator />);
		expect(screen.getByText(/Régimen Fiscal/i)).toBeInTheDocument();
	});

	it('actualiza el desglose cuando cambia el precio', () => {
		render(<PriceCalculator />);
		const input = screen.getByPlaceholderText(/300000/i);
		
		fireEvent.change(input, { target: { value: '500000' } });
		
		// El neto debe actualizarse - busca el valor formateado
		expect(screen.getByText(/\$ 440.600/i)).toBeInTheDocument();
	});

	it('cambia entre regímenes fiscales', () => {
		render(<PriceCalculator />);
		const input = screen.getByPlaceholderText(/300000/i);
		fireEvent.change(input, { target: { value: '300000' } });
		
		// Cambiar a responsible
		const responsibleButton = screen.getByText(/Responsable de IVA/i);
		fireEvent.click(responsibleButton);
		
		// Debe mostrar IVA y Huésped Ve
		expect(screen.getByText(/IVA \(19%\)/i)).toBeInTheDocument();
		expect(screen.getAllByText(/Huésped Ve/i).length).toBeGreaterThan(0);
	});

	it('formatea números como moneda COP', () => {
		render(<PriceCalculator />);
		const input = screen.getByPlaceholderText(/300000/i);
		fireEvent.change(input, { target: { value: '300000' } });
		
		// Debe mostrar formato con separadores de miles
		expect(screen.getAllByText(/\$ 300.000/i).length).toBeGreaterThan(0);
	});
});
