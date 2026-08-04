import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import SubscriptionCancelled from '@/emails/SubscriptionCancelled';

describe('SubscriptionCancelled Email Template', () => {
  const defaultProps = {
    hotelName: 'Hotel Test',
    planLabel: 'Pro',
    periodEnd: new Date('2026-09-03T00:00:00Z'),
    reactivateUrl: 'https://hospedasuite.com/dashboard/billing',
  };

  it('should render hotel name correctly', async () => {
    const html = await render(<SubscriptionCancelled {...defaultProps} />);
    expect(html).toContain('Hotel Test');
  });

  it('should render plan label correctly', async () => {
    const html = await render(<SubscriptionCancelled {...defaultProps} />);
    expect(html).toContain('Pro');
  });

  it('should format date in es-CO locale', async () => {
    const html = await render(<SubscriptionCancelled {...defaultProps} />);
    // Should contain Spanish month name and Colombian format
    expect(html).toContain('septiembre');
    expect(html).toContain('2026');
  });

  it('should include reactivate URL in button', async () => {
    const html = await render(<SubscriptionCancelled {...defaultProps} />);
    expect(html).toContain('https://hospedasuite.com/dashboard/billing');
    expect(html).toContain('Reactivar suscripción');
  });

  it('should include support email', async () => {
    const html = await render(<SubscriptionCancelled {...defaultProps} />);
    expect(html).toContain('soporte@hospedasuite.com');
  });

  it('should include "access until period end" message', async () => {
    const html = await render(<SubscriptionCancelled {...defaultProps} />);
    expect(html).toContain('Acceso hasta el');
    expect(html).toContain('septiembre');
  });

  it('should include 90-day data retention message', async () => {
    const html = await render(<SubscriptionCancelled {...defaultProps} />);
    expect(html).toContain('90 días');
    expect(html).toContain('datos');
  });

  it('should include "subscription cancelled" heading', async () => {
    const html = await render(<SubscriptionCancelled {...defaultProps} />);
    expect(html).toContain('Suscripción Cancelada');
  });

  it('should handle different plan labels', async () => {
    const props = { ...defaultProps, planLabel: 'Enterprise' };
    const html = await render(<SubscriptionCancelled {...props} />);
    expect(html).toContain('Enterprise');
  });

  it('should include message about reactivation option', async () => {
    const html = await render(<SubscriptionCancelled {...defaultProps} />);
    expect(html).toContain('reactivar');
    expect(html).toContain('cambiaste de opinión');
  });
});
