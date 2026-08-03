// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { ProgressIndicator } from '@/components/ui/ProgressIndicator';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('div', props, children),
  },
}));

describe('ProgressIndicator', () => {
  it('renders the three default checkout steps', () => {
    const { getByText } = render(<ProgressIndicator currentStep={1} />);
    expect(getByText('Datos')).toBeInTheDocument();
    expect(getByText('Pago')).toBeInTheDocument();
    expect(getByText('Confirmación')).toBeInTheDocument();
  });

  it('marks the current step with aria-current', () => {
    const { getByText } = render(<ProgressIndicator currentStep={2} />);
    expect(getByText('Pago').closest('[aria-current="step"]')).toBeInTheDocument();
  });

  it('distinguishes completed, current and pending steps', () => {
    const { container } = render(<ProgressIndicator currentStep={2} />);
    const steps = container.querySelectorAll('[role="listitem"]');
    expect(steps.length).toBe(3);
    expect(steps[0]).toHaveAttribute('data-step-state', 'completed');
    expect(steps[1]).toHaveAttribute('data-step-state', 'current');
    expect(steps[2]).toHaveAttribute('data-step-state', 'pending');
  });

  it('accepts custom step labels', () => {
    const { getByText } = render(
      <ProgressIndicator currentStep={1} steps={['Personal', 'Billing', 'Done']} />
    );
    expect(getByText('Personal')).toBeInTheDocument();
    expect(getByText('Billing')).toBeInTheDocument();
    expect(getByText('Done')).toBeInTheDocument();
  });
});
