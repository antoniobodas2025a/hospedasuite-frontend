// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import { AmenityGlass } from '../AmenityGlass';

const MockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg data-testid="mock-icon" {...props}>
    <circle cx="12" cy="12" r="10" />
  </svg>
);

describe('AmenityGlass', () => {
  it('renders the default variant with icon, title, and story', () => {
    const { getByText, queryByText, getByTestId } = render(
      <AmenityGlass
        icon={MockIcon}
        title="High-speed Wi-Fi"
        story="Stay connected with premium fiber internet"
      />
    );

    expect(getByTestId('mock-icon')).toBeInTheDocument();
    expect(getByText('High-speed Wi-Fi')).toBeInTheDocument();
    expect(getByText('Stay connected with premium fiber internet')).toBeInTheDocument();
    expect(queryByText('High-speed Wi-Fi')).toBeInTheDocument();
  });

  it('renders the compact variant with icon and title but without the story', () => {
    const { getByText, getByTestId, queryByText } = render(
      <AmenityGlass
        icon={MockIcon}
        title="Air conditioning"
        story="Climate control for every season"
        compact
      />
    );

    expect(getByTestId('mock-icon')).toBeInTheDocument();
    expect(getByText('Air conditioning')).toBeInTheDocument();
    expect(queryByText('Climate control for every season')).not.toBeInTheDocument();
  });
});
