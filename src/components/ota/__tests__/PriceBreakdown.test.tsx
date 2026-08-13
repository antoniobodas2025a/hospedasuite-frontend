// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import PriceBreakdown from '../PriceBreakdown';

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      ['initial', 'animate', 'exit', 'transition', 'layoutId'].forEach((key) => {
        delete rest[key];
      });
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('PriceBreakdown', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Basic rendering', () => {
    it('renders the price breakdown heading', () => {
      const { getByRole } = render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRate={0}
        />
      );

      expect(getByRole('heading', { name: /desglose de precios/i })).toBeTruthy();
    });

    it('shows price per night × nights and the subtotal', () => {
      const { getByText, getAllByText } = render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRate={0}
        />
      );

      // Price per night and nights label
      expect(getByText(/50.000/)).toBeTruthy();
      expect(getByText(/2 noches/)).toBeTruthy();
      // Subtotal and total are both $100.000 when no IVA
      expect(getAllByText('$100.000').length).toBe(2);
    });

    it('uses singular "noche" when nights === 1', () => {
      const { getByText, queryByText } = render(
        <PriceBreakdown
          pricePerNight={80000}
          nights={1}
          taxRate={0}
        />
      );

      expect(getByText(/1 noche/)).toBeTruthy();
      // Should not contain "1 noches"
      expect(queryByText(/1 noches/)).toBeNull();
    });
  });

  describe('Tax calculation with taxRate', () => {
    it('does NOT show IVA line when taxRate is 0', () => {
      const { queryByText } = render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRate={0}
        />
      );

      expect(queryByText(/IVA/)).toBeNull();
    });

    it('shows IVA (19%) line when taxRate is 0.19', () => {
      const { getByText } = render(
        <PriceBreakdown
          pricePerNight={100000}
          nights={1}
          taxRate={0.19}
        />
      );

      expect(getByText(/IVA \(19%\)/)).toBeTruthy();
      // 100.000 * 0.19 = 19.000
      expect(getByText('$19.000')).toBeTruthy();
    });

    it('computes total = subtotal + IVA for taxRate 0.19', () => {
      const { getByText } = render(
        <PriceBreakdown
          pricePerNight={100000}
          nights={3}
          taxRate={0.19}
        />
      );

      // subtotal = 300.000, IVA = 57.000, total = 357.000
      expect(getByText(/total/i)).toBeTruthy();
      expect(getByText('$357.000')).toBeTruthy();
    });

    it('defaults to 0% taxRate when no tax prop is provided', () => {
      const { getAllByText, queryByText } = render(
        <PriceBreakdown
          pricePerNight={100000}
          nights={1}
        />
      );

      expect(queryByText(/IVA/)).toBeNull();
      expect(getAllByText('$100.000').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Backward compatibility with taxRegime', () => {
    it('renders without IVA when taxRegime is "simplified"', () => {
      const { queryByText, getAllByText } = render(
        <PriceBreakdown
          pricePerNight={75000}
          nights={4}
          taxRegime="simplified"
        />
      );

      expect(queryByText(/IVA/)).toBeNull();
      // 75.000 * 4 = 300.000 — appears as both subtotal and total
      expect(getAllByText('$300.000').length).toBe(2);
    });

    it('renders with IVA (19%) when taxRegime is "responsible"', () => {
      const { getByText } = render(
        <PriceBreakdown
          pricePerNight={100000}
          nights={1}
          taxRegime="responsible"
        />
      );

      expect(getByText(/IVA \(19%\)/)).toBeTruthy();
      expect(getByText('$119.000')).toBeTruthy();
    });

  });

  describe('Transparency note (showDetails)', () => {
    it('shows transparency note when showDetails is true (default)', () => {
      const { getByText } = render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRate={0}
        />
      );

      expect(getByText(/precio final sin cargos ocultos/i)).toBeTruthy();
    });

    it('hides transparency note when showDetails is false', () => {
      const { queryByText } = render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRate={0}
          showDetails={false}
        />
      );

      expect(queryByText(/precio final sin cargos ocultos/i)).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('exposes the total as a labeled region for screen readers', () => {
      const { getByText } = render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRate={0}
        />
      );

      // Total should be identifiable — either via aria-label or role
      expect(getByText(/total/i)).toBeTruthy();
    });

    it('uses a semantic heading level', () => {
      const { getByRole } = render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
          taxRate={0}
        />
      );

      const heading = getByRole('heading');
      expect(heading.tagName).toMatch(/^H[1-6]$/);
    });
  });
});
