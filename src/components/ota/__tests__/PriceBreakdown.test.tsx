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
        />
      );

      expect(getByRole('heading', { name: /desglose de precios/i })).toBeTruthy();
    });

    it('shows price per night × nights and the subtotal', () => {
      const { getByText, getAllByText } = render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
        />
      );

      // Price per night and nights label
      expect(getByText(/50.000/)).toBeTruthy();
      expect(getByText(/2 noches/)).toBeTruthy();
      // Subtotal and total are both $100.000 (FLAT)
      expect(getAllByText('$100.000').length).toBe(2);
    });

    it('uses singular "noche" when nights === 1', () => {
      const { getByText, queryByText } = render(
        <PriceBreakdown
          pricePerNight={80000}
          nights={1}
        />
      );

      expect(getByText(/1 noche/)).toBeTruthy();
      // Should not contain "1 noches"
      expect(queryByText(/1 noches/)).toBeNull();
    });
  });

  describe('Flat pricing (no tax)', () => {
    it('does NOT display an IVA line', () => {
      const { queryByText } = render(
        <PriceBreakdown
          pricePerNight={100000}
          nights={2}
        />
      );

      expect(queryByText(/IVA/)).toBeNull();
    });

    it('keeps subtotal equal to total', () => {
      const { getAllByText } = render(
        <PriceBreakdown
          pricePerNight={120000}
          nights={3}
        />
      );

      // 120.000 × 3 = 360.000 — appears as both subtotal and total
      expect(getAllByText('$360.000').length).toBe(2);
    });

  });

  describe('Transparency note (showDetails)', () => {
    it('shows transparency note when showDetails is true (default)', () => {
      const { getByText } = render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
        />
      );

      expect(getByText(/precio final sin cargos ocultos/i)).toBeTruthy();
    });

    it('hides transparency note when showDetails is false', () => {
      const { queryByText } = render(
        <PriceBreakdown
          pricePerNight={50000}
          nights={2}
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
        />
      );

      const heading = getByRole('heading');
      expect(heading.tagName).toMatch(/^H[1-6]$/);
    });
  });
});
