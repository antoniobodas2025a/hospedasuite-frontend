// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import { CelebrationAnimation } from '@/components/ui/CelebrationAnimation';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, {}, children),
  useReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
}));

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
};

describe('CelebrationAnimation', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders an animated checkmark when visible', () => {
    const { getByTestId } = render(<CelebrationAnimation isVisible />);
    expect(getByTestId('celebration-checkmark')).toBeInTheDocument();
  });

  it('renders confetti particles when visible', () => {
    const { getAllByTestId } = render(<CelebrationAnimation isVisible />);
    expect(getAllByTestId('confetti-particle').length).toBeGreaterThan(0);
  });

  it('does not render confetti when reduced motion is preferred', () => {
    mockMatchMedia(true);
    const { queryAllByTestId, getByTestId } = render(<CelebrationAnimation isVisible />);
    expect(getByTestId('celebration-checkmark')).toBeInTheDocument();
    expect(queryAllByTestId('confetti-particle').length).toBe(0);
  });

  it('calls onComplete after the animation finishes', async () => {
    const onComplete = vi.fn();
    render(<CelebrationAnimation isVisible onComplete={onComplete} />);
    await waitFor(() => expect(onComplete).toHaveBeenCalled(), { timeout: 1500 });
  });
});
