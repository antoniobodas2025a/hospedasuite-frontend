import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import PaymentFailed from '@/emails/PaymentFailed';

describe('PaymentFailed Email Template', () => {
  const defaultProps = {
    hotelName: 'Hotel Test',
    planLabel: 'Pro',
    amount: 99000,
    paymentUrl: 'https://checkout.wompi.co/p/?test=123',
    failureReason: 'Tarjeta rechazada',
  };

  it('should render hotel name correctly', async () => {
    const html = await render(<PaymentFailed {...defaultProps} />);
    expect(html).toContain('Hotel Test');
  });

  it('should render plan label correctly', async () => {
    const html = await render(<PaymentFailed {...defaultProps} />);
    expect(html).toContain('Pro');
  });

  it('should format amount in COP correctly', async () => {
    const html = await render(<PaymentFailed {...defaultProps} />);
    expect(html).toContain('99.000');
    expect(html).toContain('COP');
  });

  it('should include payment URL in button', async () => {
    const html = await render(<PaymentFailed {...defaultProps} />);
    expect(html).toContain('https://checkout.wompi.co/p/?test=123');
    expect(html).toContain('Intentar pago nuevamente');
  });

  it('should include failure reason when provided', async () => {
    const html = await render(<PaymentFailed {...defaultProps} />);
    expect(html).toContain('Tarjeta rechazada');
    expect(html).toContain('Razón:');
  });

  it('should not include failure reason section when not provided', async () => {
    const props = { ...defaultProps, failureReason: undefined };
    const html = await render(<PaymentFailed {...props} />);
    expect(html).not.toContain('Razón:');
  });

  it('should include support email', async () => {
    const html = await render(<PaymentFailed {...defaultProps} />);
    expect(html).toContain('soporte@hospedasuite.com');
  });

  it('should include warning about service suspension', async () => {
    const html = await render(<PaymentFailed {...defaultProps} />);
    expect(html).toContain('7 días');
    expect(html).toContain('suspendida');
  });

  it('should include "Pago Rechazado" heading', async () => {
    const html = await render(<PaymentFailed {...defaultProps} />);
    expect(html).toContain('Pago Rechazado');
  });

  it('should handle large amounts correctly', async () => {
    const props = { ...defaultProps, amount: 1250000 };
    const html = await render(<PaymentFailed {...props} />);
    expect(html).toContain('1.250.000');
  });

  it('should handle different failure reasons', async () => {
    const props = { ...defaultProps, failureReason: 'Fondos insuficientes' };
    const html = await render(<PaymentFailed {...props} />);
    expect(html).toContain('Fondos insuficientes');
  });
});
