// @vitest-environment jsdom
import '../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { HotelRejected } from '../HotelRejected';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('HotelRejected Email', () => {
  const defaultProps = {
    hotelName: 'Hotel Test',
    rejectionReason: 'Información incompleta en el perfil',
  };

  it('should render hotel name', () => {
    const { container } = render(<HotelRejected {...defaultProps} />);
    expect(container.textContent).toContain('Hotel Test');
  });

  it('should render rejection message', () => {
    const { container } = render(<HotelRejected {...defaultProps} />);
    expect(container.textContent).toContain('no ha sido aprobada');
  });

  it('should render rejection reason', () => {
    const { container } = render(<HotelRejected {...defaultProps} />);
    expect(container.textContent).toContain('Información incompleta en el perfil');
  });

  it('should render support button', () => {
    const { container } = render(<HotelRejected {...defaultProps} />);
    expect(container.textContent).toContain('Contactar Soporte');
  });

  it('should render next steps', () => {
    const { container } = render(<HotelRejected {...defaultProps} />);
    expect(container.textContent).toContain('Revisa el motivo');
    expect(container.textContent).toContain('Corrige los problemas');
  });
});
