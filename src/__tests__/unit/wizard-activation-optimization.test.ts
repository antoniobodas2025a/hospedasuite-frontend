import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Wizard Activation Optimization', () => {
  const AUTH_STEP_PATH = path.resolve(process.cwd(), 'src/components/onboarding/AuthStep.tsx');
  const WOMPI_BUTTON_PATH = path.resolve(process.cwd(), 'src/components/payments/WompiButton.tsx');
  const PAYMENT_REVIEW_PATH = path.resolve(process.cwd(), 'src/components/onboarding/PaymentReviewStep.tsx');
  const PAYMENT_STEP_PATH = path.resolve(process.cwd(), 'src/components/onboarding/PaymentStep.tsx');

  // ─── S1: Prevención de errores en contraseña (Heurística #5) ───

  it('AuthStep debe tener estado showPassword para toggle de visibilidad', () => {
    const content = fs.readFileSync(AUTH_STEP_PATH, 'utf8');
    expect(content).toContain('showPassword');
    expect(content).toContain('setShowPassword');
  });

  it('AuthStep debe importar Eye y EyeOff de lucide-react', () => {
    const content = fs.readFileSync(AUTH_STEP_PATH, 'utf8');
    expect(content).toContain('Eye');
    expect(content).toContain('EyeOff');
  });

  it('AuthStep debe renderizar botón toggle con aria-label accesible', () => {
    const content = fs.readFileSync(AUTH_STEP_PATH, 'utf8');
    expect(content).toContain('aria-label');
    expect(content).toContain('Mostrar contraseña');
    expect(content).toContain('Ocultar contraseña');
  });

  it('AuthStep debe alternar type entre "password" y "text"', () => {
    const content = fs.readFileSync(AUTH_STEP_PATH, 'utf8');
    // Must use conditional type based on showPassword
    expect(content).toMatch(/type=\{showPassword \? ['"]text['"] : ['"]password['"]\}/);
  });

  it('MUTACIÓN: si se elimina el toggle de visibilidad, el test debe fallar', () => {
    const content = fs.readFileSync(AUTH_STEP_PATH, 'utf8');
    // Must have both Eye icons and the toggle button
    expect(content).toContain('Eye');
    expect(content).toContain('EyeOff');
    expect(content).toContain('setShowPassword(!showPassword)');
  });

  // ─── S2: Corrección de Expectativa Comercial (30 Días) ───

  it('WompiButton debe decir "30 Días Gratis" no "90 Días"', () => {
    const content = fs.readFileSync(WOMPI_BUTTON_PATH, 'utf8');
    expect(content).toContain('30 Días Gratis');
    expect(content).not.toContain('90 Días');
    expect(content).not.toContain('90 días');
  });

  it('PaymentReviewStep debe decir "30 días" en la activación gratuita', () => {
    const content = fs.readFileSync(PAYMENT_REVIEW_PATH, 'utf8');
    expect(content).toContain('30 días');
    expect(content).not.toContain('90 días');
    expect(content).not.toContain('90 Días');
  });

  it('PaymentStep debe decir "30 días" en la opción gratuita móvil', () => {
    const content = fs.readFileSync(PAYMENT_STEP_PATH, 'utf8');
    expect(content).toContain('30 días');
    expect(content).not.toContain('90 días');
  });

  it('PaymentStep debe ofrecer "Activar gratis" en TODOS los dispositivos (no solo mobile)', () => {
    const content = fs.readFileSync(PAYMENT_STEP_PATH, 'utf8');
    // The free activation button must NOT be gated behind isMobile
    // After the fix, "Activar gratis" should appear in the file WITHOUT being inside {isMobile && (...)}
    // Simple check: the file should NOT contain the pattern "{isMobile &&" followed by "Activar gratis" within the same JSX block
    const lines = content.split('\n');
    let inMobileBlock = false;
    let braceDepth = 0;
    for (const line of lines) {
      if (line.includes('{isMobile &&')) {
        inMobileBlock = true;
        braceDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      }
      if (inMobileBlock) {
        braceDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        if (line.includes('Activar gratis')) {
          // Found inside mobile block - FAIL
          expect(true).toBe(false); // Force failure
        }
        if (braceDepth <= 0) inMobileBlock = false;
      }
    }
    // If we got here, "Activar gratis" is NOT inside the mobile block - PASS
    expect(true).toBe(true);
  });

  it('MUTACIÓN: si se reintroduce "90 Días" en cualquier componente del wizard, debe fallar', () => {
    const paths = [WOMPI_BUTTON_PATH, PAYMENT_REVIEW_PATH, PAYMENT_STEP_PATH];
    for (const p of paths) {
      const content = fs.readFileSync(p, 'utf8');
      expect(content).not.toMatch(/90\s*[Dd]ías/);
    }
  });

  // ─── S3: Eliminación del Cuello de Botella (Ley de Hick) ───

  it('WompiButton NO debe usar "Conectando con Bóveda" como texto de carga', () => {
    const content = fs.readFileSync(WOMPI_BUTTON_PATH, 'utf8');
    expect(content).not.toContain('Conectando con Bóveda');
    expect(content).not.toContain('Bóveda');
  });

  it('WompiButton debe usar lenguaje neutro durante la carga', () => {
    const content = fs.readFileSync(WOMPI_BUTTON_PATH, 'utf8');
    expect(content).toContain('Procesando');
  });

  it('ProvisioningStep NO debe depender de Wompi para activar la propiedad', () => {
    const PROV_PATH = path.resolve(process.cwd(), 'src/components/onboarding/ProvisioningStep.tsx');
    const content = fs.readFileSync(PROV_PATH, 'utf8');
    // Must NOT import or call Wompi directly
    expect(content).not.toContain('WompiButton');
    expect(content).not.toContain('generateWompiSignature');
    expect(content).not.toContain('conectarBoveda');
    // Must accept 'free' payment method
    expect(content).toMatch(/['"]free['"]/);
  });

  it('PaymentReviewStep debe permitir activación sin pago (free method)', () => {
    const content = fs.readFileSync(PAYMENT_REVIEW_PATH, 'utf8');
    // Must have isFree branch that allows activation
    expect(content).toContain('isFree');
    expect(content).toContain('Activar propiedad');
    // Must NOT block on Wompi
    expect(content).not.toContain('WompiButton');
  });
});
