// @vitest-environment jsdom
import '../bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';

import PriceCalculator from '@/components/dashboard/PriceCalculator';

function MotionMock(tag: keyof React.JSX.IntrinsicElements) {
  return function MockedMotion({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
    const rest = { ...props };
    ['initial', 'animate', 'exit', 'transition', 'layout', 'layoutId', 'whileTap'].forEach((key) => {
      delete rest[key];
    });
    return React.createElement(tag, rest, children);
  };
}

vi.mock('framer-motion', () => ({
  motion: {
    div: MotionMock('div'),
  },
}));

describe('PriceCalculator (FLAT model)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not render regime selector buttons', () => {
    const { queryByText } = render(<PriceCalculator basePrice={300000} />);

    expect(queryByText('Simplificado')).not.toBeInTheDocument();
    expect(queryByText('Responsable de IVA')).not.toBeInTheDocument();
  });

  it('does not render IVA line', () => {
    const { queryByText } = render(<PriceCalculator basePrice={300000} />);

    expect(queryByText(/IVA\s*\(/i)).not.toBeInTheDocument();
  });

  it('shows total equal to base price', () => {
    const { getByTestId } = render(<PriceCalculator basePrice={300000} />);

    const totalRow = getByTestId('price-total');
    expect(totalRow).toBeInTheDocument();
    expect(totalRow).toHaveTextContent(/300[.,]000/);
  });

  it('updates total when base price changes', () => {
    const { getByTestId } = render(<PriceCalculator basePrice={450000} />);

    const totalRow = getByTestId('price-total');
    expect(totalRow).toHaveTextContent(/450[.,]000/);
  });
});
