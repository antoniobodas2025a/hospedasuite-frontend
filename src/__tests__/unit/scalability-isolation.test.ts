import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Scalability & Multi-Tenant Isolation', () => {
  const HOTEL_CONTEXT_PATH = path.resolve(process.cwd(), 'src/lib/hotel-context.ts');
  const PAYMENT_GATEWAY_PATH = path.resolve(process.cwd(), 'src/lib/payment-gateway.ts');

  it('hotel-context.ts debe usar hospeda_active_tenant cookie para aislamiento', () => {
    const content = fs.readFileSync(HOTEL_CONTEXT_PATH, 'utf8');
    expect(content).toContain('hospeda_active_tenant');
    expect(content).toContain('staff'); // Multi-tenant via staff table
  });

  it('payment-gateway.ts debe existir y definir interfaz PaymentGateway', () => {
    const content = fs.readFileSync(PAYMENT_GATEWAY_PATH, 'utf8');
    expect(content).toContain('interface PaymentGateway');
    expect(content).toContain('getCheckoutUrl');
  });

  it('payment-gateway.ts debe garantizar Soberanía Financiera (0% comisión)', () => {
    const content = fs.readFileSync(PAYMENT_GATEWAY_PATH, 'utf8');
    // Must use hotel keys, not platform keys
    expect(content).toContain('hotelPublicKey');
    expect(content).not.toContain('platformCommission');
  });

  it('no debe usar jerga técnica en la UI de conectores', () => {
    const CONNECTORS_PATH = path.resolve(process.cwd(), 'src/components/dashboard/PaymentConnectors.tsx');
    const content = fs.readFileSync(CONNECTORS_PATH, 'utf8');
    expect(content).not.toContain('Multi-Tenant');
    expect(content).not.toContain('API Key');
    expect(content).toContain('Conectores de Pago');
  });
});
