import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import RenewalReminder from '@/emails/RenewalReminder';

describe('RenewalReminder Email Template', () => {
  const defaultProps = {
    hotelName: 'Hotel Test',
    planLabel: 'Pro',
    amount: 99000,
    paymentUrl: 'https://checkout.wompi.co/p/?test=123',
    periodEnd: new Date('2026-09-03T00:00:00Z'),
  };

  it('should render hotel name correctly', async () => {
    const html = await render(<RenewalReminder {...defaultProps} />);
    expect(html).toContain('Hotel Test');
  });

  it('should render plan label correctly', async () => {
    const html = await render(<RenewalReminder {...defaultProps} />);
    expect(html).toContain('Pro');
  });

  it('should format amount in COP correctly', async () => {
    const html = await render(<RenewalReminder {...defaultProps} />);
    expect(html).toContain('99.000');
    expect(html).toContain('COP');
  });

  it('should format date in es-CO locale', async () => {
    const html = await render(<RenewalReminder {...defaultProps} />);
    // Should contain Spanish month name and Colombian format
    expect(html).toContain('septiembre');
    expect(html).toContain('2026');
  });

  it('should include payment URL in button', async () => {
    const html = await render(<RenewalReminder {...defaultProps} />);
    expect(html).toContain('https://checkout.wompi.co/p/?test=123');
    expect(html).toContain('Pagar ahora');
  });

  it('should include support email', async () => {
    const html = await render(<RenewalReminder {...defaultProps} />);
    expect(html).toContain('soporte@hospedasuite.com');
  });

  it('should include "ignore if already paid" message', async () => {
    const html = await render(<RenewalReminder {...defaultProps} />);
    expect(html).toContain('Si ya realizaste el pago');
  });

  it('should handle large amounts correctly', async () => {
    const props = { ...defaultProps, amount: 1250000 };
    const html = await render(<RenewalReminder {...props} />);
    expect(html).toContain('1.250.000');
  });

  it('should handle different plan labels', async () => {
    const props = { ...defaultProps, planLabel: 'Enterprise' };
    const html = await render(<RenewalReminder {...props} />);
    expect(html).toContain('Enterprise');
  });
});
