import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Wompi Sandbox Toggle — UI Purity & Safety', () => {
  const SETTINGS_STEP_PATH = path.resolve(process.cwd(), 'src/components/onboarding/SettingsStep.tsx');
  const CHECKOUT_FORM_PATH = path.resolve(process.cwd(), 'src/components/checkout/CheckoutForm.tsx');

  it('debe contener el Toggle de "Modo de Prueba"', () => {
    const content = fs.readFileSync(SETTINGS_STEP_PATH, 'utf8');
    expect(content).toContain('Modo de Prueba');
    expect(content).toContain('wompi_sandbox_mode');
  });

  it('no debe usar jerga técnica como "Sandbox" en la UI', () => {
    const content = fs.readFileSync(SETTINGS_STEP_PATH, 'utf8');
    expect(content).not.toContain('Sandbox');
    expect(content).not.toContain('Test Environment');
  });

  it('CheckoutForm debe usar URL de sandbox si wompi_sandbox_mode es true', () => {
    const content = fs.readFileSync(CHECKOUT_FORM_PATH, 'utf8');
    expect(content).toContain('checkout.sandbox.wompi.co');
    expect(content).toContain('wompi_sandbox_mode');
  });

  it('debe mostrar advertencia visual cuando está en modo de prueba', () => {
    const content = fs.readFileSync(SETTINGS_STEP_PATH, 'utf8');
    expect(content).toContain('Estás en modo de prueba');
    expect(content).toContain('No uses tarjetas reales');
  });
});
