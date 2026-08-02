// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('div', props, children),
  },
}));

describe('SkeletonLoader', () => {
  it('renders an accessible loading skeleton', () => {
    const { getByTestId } = render(<SkeletonLoader />);
    const skeleton = getByTestId('skeleton-loader');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  });

  it('applies the provided width and height', () => {
    const { getByTestId } = render(
      <SkeletonLoader width={200} height={40} />
    );
    const skeleton = getByTestId('skeleton-loader');
    expect(skeleton).toHaveStyle({ width: '200px', height: '40px' });
  });

  it('applies a shimmer overlay', () => {
    const { container } = render(<SkeletonLoader />);
    const shimmer = container.querySelector('[data-testid="skeleton-shimmer"]');
    expect(shimmer).toBeInTheDocument();
  });
});
