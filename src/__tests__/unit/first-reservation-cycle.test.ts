import { describe, it, expect } from 'vitest';
import { settingsSchema } from '@/lib/onboarding-schemas';
import fs from 'fs';
import path from 'path';

// ============================================================================
// FIX 1: Webhook DB Alignment (wompi_integrity_secret vs wompi_events_secret)
// ============================================================================

describe('Fix 1: Webhook DB Alignment', () => {
  const WEBHOOK_PATH = path.resolve(process.cwd(), 'src/app/api/webhooks/tenant/wompi/route.ts');

  it('el webhook debe consultar wompi_integrity_secret (columna existente en DB)', () => {
    const content = fs.readFileSync(WEBHOOK_PATH, 'utf8');
    // Debe usar wompi_integrity_secret
    expect(content).toContain('wompi_integrity_secret');
    // NO debe usar wompi_events_secret (columna inexistente)
    expect(content).not.toContain('wompi_events_secret');
  });

  it('la verificación de firma debe usar el secreto correcto', () => {
    const content = fs.readFileSync(WEBHOOK_PATH, 'utf8');
    expect(content).toContain('verifyWompiSignature(payload, hotel.wompi_integrity_secret)');
  });

  it('el schema de DB debe tener wompi_integrity_secret', () => {
    const DB_TYPES_PATH = path.resolve(process.cwd(), 'src/types/database.ts');
    const content = fs.readFileSync(DB_TYPES_PATH, 'utf8');
    expect(content).toContain('wompi_integrity_secret?: string');
  });
});

// ============================================================================
// FIX 2: Wompi Keys in Onboarding (Ley de Hick)
// ============================================================================

describe('Fix 2: Wompi Keys in Onboarding', () => {
  it('settingsSchema debe exigir wompi_public_key', () => {
    const result = settingsSchema.safeParse({
      amenities: [],
      checkInTime: '15:00',
      checkOutTime: '11:00',
      taxRate: 0,
      // Faltan las claves de Wompi
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
      expect(fieldErrors).toContain('wompi_public_key');
      expect(fieldErrors).toContain('wompi_integrity_secret');
    }
  });

  it('settingsSchema debe aceptar datos válidos con claves de Wompi', () => {
    const result = settingsSchema.safeParse({
      amenities: ['wifi'],
      checkInTime: '15:00',
      checkOutTime: '11:00',
      taxRate: 0,
      wompi_public_key: 'pub_prod_abc123',
      wompi_integrity_secret: 'integ_prod_xyz789',
    });
    expect(result.success).toBe(true);
  });

  it('settingsSchema debe rechazar claves de Wompi vacías', () => {
    const result = settingsSchema.safeParse({
      amenities: [],
      checkInTime: '15:00',
      checkOutTime: '11:00',
      taxRate: 0,
      wompi_public_key: '',
      wompi_integrity_secret: 'integ_prod_xyz789',
    });
    expect(result.success).toBe(false);
  });

  it('SettingsStep.tsx debe contener campos de Wompi', () => {
    const SETTINGS_STEP_PATH = path.resolve(process.cwd(), 'src/components/onboarding/SettingsStep.tsx');
    const content = fs.readFileSync(SETTINGS_STEP_PATH, 'utf8');
    expect(content).toContain('wompi_public_key');
    expect(content).toContain('wompi_integrity_secret');
    expect(content).toContain('Pasarela de Pagos');
  });

  it('onboarding.ts debe guardar las claves de Wompi en la DB', () => {
    const ONBOARDING_PATH = path.resolve(process.cwd(), 'src/app/actions/onboarding.ts');
    const content = fs.readFileSync(ONBOARDING_PATH, 'utf8');
    expect(content).toContain('wompi_public_key: state.settings.wompi_public_key');
    expect(content).toContain('wompi_integrity_secret: state.settings.wompi_integrity_secret');
  });
});

// ============================================================================
// FIX 3: Checkout uses Hotel's Wompi Key (Soberanía Financiera)
// ============================================================================

describe('Fix 3: Checkout uses Hotel Wompi Key', () => {
  const CHECKOUT_PATH = path.resolve(process.cwd(), 'src/components/checkout/CheckoutForm.tsx');

  it('CheckoutForm debe usar hotel.wompi_public_key como prioridad', () => {
    const content = fs.readFileSync(CHECKOUT_PATH, 'utf8');
    // Debe usar hotel.wompi_public_key primero
    expect(content).toContain('hotel.wompi_public_key');
    // El env var debe ser fallback, no primary
    expect(content).toContain("hotel.wompi_public_key || process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY");
  });

  it('MUTATION: Si se revierte a solo env var, el test debe fallar', () => {
    const content = fs.readFileSync(CHECKOUT_PATH, 'utf8');
    // La línea NO debe ser SOLO process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY
    const rawKeyLine = content.match(/const rawKey = .+/);
    expect(rawKeyLine).not.toBeNull();
    expect(rawKeyLine![0]).toContain('hotel.wompi_public_key');
  });
});

// ============================================================================
// FIX 4: Demo Bypass Hidden in Production (Heurística #5)
// ============================================================================

describe('Fix 4: Demo Bypass Hidden in Production', () => {
  const PAYMENT_STEP_PATH = path.resolve(process.cwd(), 'src/components/onboarding/PaymentStep.tsx');

  it('el botón Demo bypass debe estar protegido por NODE_ENV !== production', () => {
    const content = fs.readFileSync(PAYMENT_STEP_PATH, 'utf8');
    expect(content).toContain("process.env.NODE_ENV !== 'production'");
  });

  it('MUTATION: Si la condición se invierte (===), el test debe fallar', () => {
    const content = fs.readFileSync(PAYMENT_STEP_PATH, 'utf8');
    // Debe existir la protección !== 'production'
    expect(content).toContain("process.env.NODE_ENV !== 'production'");
    // NO debe existir === 'production' para el demo bypass
    const demoBypassSection = content.match(/Demo bypass[\s\S]*?button[\s\S]*?\/>/);
    if (demoBypassSection) {
      expect(demoBypassSection[0]).not.toContain("=== 'production'");
    }
  });

  it('el texto del botón debe estar en las traducciones', () => {
    const content = fs.readFileSync(PAYMENT_STEP_PATH, 'utf8');
    expect(content).toContain("t('demoBypass')");
  });
});
