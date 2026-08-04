// @vitest-environment jsdom
import '../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { HotelApproved } from '../HotelApproved';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('HotelApproved Email', () => {
  const defaultProps = {
    hotelName: 'Hotel Test',
    hotelSlug: 'hotel-test',
  };

  it('should render hotel name', () => {
    const { container } = render(<HotelApproved {...defaultProps} />);
    expect(container.textContent).toContain('Hotel Test');
  });

  it('should render approval message', () => {
    const { container } = render(<HotelApproved {...defaultProps} />);
    expect(container.textContent).toContain('ha sido aprobado');
  });

  it('should render hotel URL', () => {
    const { container } = render(<HotelApproved {...defaultProps} />);
    expect(container.textContent).toContain('hotel-test');
  });

  it('should render dashboard button', () => {
    const { container } = render(<HotelApproved {...defaultProps} />);
    expect(container.textContent).toContain('Ir al Dashboard');
  });

  it('should render next steps', () => {
    const { container } = render(<HotelApproved {...defaultProps} />);
    expect(container.textContent).toContain('Configura tu pasarela de pagos');
    expect(container.textContent).toContain('Verifica que todas tus habitaciones');
  });
});
