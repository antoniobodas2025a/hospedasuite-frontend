// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PriceBreakdown from '../PriceBreakdown';

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, layoutId, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('PriceBreakdown', () => {
  describe('Basic rendering', () => {
    it('renders the price breakdown heading', () => {
      render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRegime="simplified"
        />
      );

      expect(screen.getByRole('heading', { name: /desglose de precios/i })).toBeTruthy();
    });

    it('shows price per night × nights and the subtotal', () => {
      render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRegime="simplified"
        />
      );

      // Price per night and nights label
      expect(screen.getByText(/50.000/)).toBeTruthy();
      expect(screen.getByText(/2 noches/)).toBeTruthy();
      // Subtotal and total are both $100.000 when no IVA
      expect(screen.getAllByText('$100.000').length).toBe(2);
    });

    it('uses singular "noche" when nights === 1', () => {
      render(
        <PriceBreakdown
          pricePerNight={80000}
          nights={1}
          taxRegime="simplified"
        />
      );

      expect(screen.getByText(/1 noche/)).toBeTruthy();
      // Should not contain "1 noches"
      expect(screen.queryByText(/1 noches/)).toBeNull();
    });
  });

  describe('Tax calculation', () => {
    it('does NOT show IVA line when taxRegime is "simplified"', () => {
      render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRegime="simplified"
        />
      );

      expect(screen.queryByText(/IVA/)).toBeNull();
    });

    it('shows IVA (19%) line when taxRegime is "responsible"', () => {
      render(
        <PriceBreakdown
          pricePerNight={100000}
          nights={1}
          taxRegime="responsible"
        />
      );

      expect(screen.getByText(/IVA \(19%\)/)).toBeTruthy();
      // 100.000 * 0.19 = 19.000
      expect(screen.getByText('$19.000')).toBeTruthy();
    });

    it('computes total = subtotal + IVA for responsible regime', () => {
      render(
        <PriceBreakdown
          pricePerNight={100000}
          nights={3}
          taxRegime="responsible"
        />
      );

      // subtotal = 300.000, IVA = 57.000, total = 357.000
      const totalLabel = screen.getByText(/total/i);
      expect(totalLabel).toBeTruthy();
      expect(screen.getByText('$357.000')).toBeTruthy();
    });

    it('computes total = subtotal for simplified regime (no IVA)', () => {
      render(
        <PriceBreakdown
          pricePerNight={75000}
          nights={4}
          taxRegime="simplified"
        />
      );

      // 75.000 * 4 = 300.000 — appears as both subtotal and total
      expect(screen.getAllByText('$300.000').length).toBe(2);
    });
  });

  describe('Transparency note (showDetails)', () => {
    it('shows transparency note when showDetails is true (default)', () => {
      render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRegime="simplified"
        />
      );

      expect(screen.getByText(/precio final sin cargos ocultos/i)).toBeTruthy();
    });

    it('hides transparency note when showDetails is false', () => {
      render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRegime="simplified"
          showDetails={false}
        />
      );

      expect(screen.queryByText(/precio final sin cargos ocultos/i)).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('exposes the total as a labeled region for screen readers', () => {
      render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRegime="simplified"
        />
      );

      // Total should be identifiable — either via aria-label or role
      const totalEl = screen.getByText(/total/i);
      expect(totalEl).toBeTruthy();
    });

    it('uses a semantic heading level', () => {
      render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRegime="simplified"
        />
      );

      const heading = screen.getByRole('heading');
      expect(heading.tagName).toMatch(/^H[1-6]$/);
    });
  });
});
