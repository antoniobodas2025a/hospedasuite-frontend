// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { calculatePriceBreakdown } from '../price-calculator-logic';
import { render, cleanup } from '@testing-library/react';
import PriceCalculator from '../PriceCalculator';

afterEach(() => cleanup());

// Mock framer-motion (passthrough data-testid and other props)
vi.mock("framer-motion", () => ({
	motion: {
		div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
			const rest = { ...props };
			['initial', 'animate', 'exit', 'transition', 'layout', 'layoutId', 'whileTap'].forEach((key) => {
				delete rest[key];
			});
			return React.createElement("div", rest, children);
		},
		button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
			const rest = { ...props };
			['initial', 'animate', 'exit', 'transition', 'layout', 'layoutId', 'whileTap'].forEach((key) => {
				delete rest[key];
			});
			return React.createElement("button", rest, children);
		},
	},
}));

describe('calculatePriceBreakdown', () => {
	describe('FLAT pricing (no tax)', () => {
		it('calcula desglose correcto para $300.000 COP', () => {
			const result = calculatePriceBreakdown(300000);

			expect(result).toEqual({
				basePrice: 300000,
				total: 300000,
				wompiFee: 9000,
				platformFee: 24000,
				retencion: 2640,
				hotelReceives: 264360,
			});
		});

		it('total es igual al precio base', () => {
			const result = calculatePriceBreakdown(500000);
			expect(result.total).toBe(500000);
			expect(result.basePrice).toBe(500000);
		});
	});

	describe('Retención en la fuente', () => {
		it('calcula retención 11% sobre comisión de plataforma', () => {
			const result = calculatePriceBreakdown(100000);
			expect(result.platformFee).toBe(8000);
			expect(result.retencion).toBe(880);
		});
	});

	describe('Neto que recibe el hotel', () => {
		it('calcula neto correctamente: base - wompi - platform - retencion', () => {
			const result = calculatePriceBreakdown(100000);
			const expectedNet = 100000 - 3000 - 8000 - 880;
			expect(result.hotelReceives).toBe(expectedNet);
		});
	});

	describe('Edge cases', () => {
		it('maneja precio 0 correctamente', () => {
			const result = calculatePriceBreakdown(0);
			expect(result.total).toBe(0);
			expect(result.hotelReceives).toBe(0);
		});

		it('maneja precios decimales', () => {
			const result = calculatePriceBreakdown(99999.99);
			expect(result.total).toBeCloseTo(99999.99, 2);
		});

		it('maneja precios muy grandes', () => {
			const result = calculatePriceBreakdown(10000000);
			expect(result.total).toBe(10000000);
		});
	});
});

describe('PriceCalculator Component', () => {
	it('renderiza el título de la calculadora', () => {
		const { getByText } = render(<PriceCalculator />);
		expect(getByText(/Calculadora de Precios/i)).toBeInTheDocument();
	});

	it('muestra el input para precio base', () => {
		const { getByPlaceholderText } = render(<PriceCalculator />);
		const input = getByPlaceholderText(/300000/i);
		expect(input).toBeInTheDocument();
	});

	it('no muestra el selector de régimen fiscal', () => {
		const { queryByText } = render(<PriceCalculator />);
		expect(queryByText(/Régimen Fiscal/i)).not.toBeInTheDocument();
	});

	it('muestra el neto recibido para el precio base', () => {
		const { getByText } = render(<PriceCalculator basePrice={500000} />);
		expect(getByText(/\$ 440\.600/i)).toBeInTheDocument();
	});

	it('muestra el total igual al precio base', () => {
		const { getByTestId, getByText } = render(<PriceCalculator basePrice={300000} />);

		expect(getByText(/Total/i)).toBeInTheDocument();
		expect(getByTestId('price-total')).toHaveTextContent(/\$ 300\.000/i);
	});

	it('no muestra línea de IVA desglosada', () => {
		const { queryByText } = render(<PriceCalculator basePrice={300000} />);
		expect(queryByText(/IVA\s*\(/i)).not.toBeInTheDocument();
	});

	it('formatea números como moneda COP', () => {
		const { getAllByText } = render(<PriceCalculator basePrice={300000} />);

		// Debe mostrar formato con separadores de miles (Precio Base y Total)
		expect(getAllByText(/\$ 300\.000/i).length).toBeGreaterThanOrEqual(2);
	});

	describe('Modo readonly', () => {
		it('no muestra el input de precio base', () => {
			const { queryByPlaceholderText, queryByText } = render(<PriceCalculator readonly />);
			expect(queryByPlaceholderText(/300000/i)).not.toBeInTheDocument();
			expect(queryByText('Precio Base')).not.toBeInTheDocument();
		});

		it('muestra el desglose con el label "Precio por Noche"', () => {
			const { getByText } = render(<PriceCalculator basePrice={200000} readonly />);
			expect(getByText(/Precio por Noche/i)).toBeInTheDocument();
			expect(getByText(/\$ 176\.240/i)).toBeInTheDocument();
		});
	});
});
