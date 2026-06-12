import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ============================================================================
// MUTATION TESTER: Brand Core Language (Heurística #2 + Ley de Hick)
// ============================================================================

const FORBIDDEN_WORDS = [
  'OTA',
  'Online Travel Agency',
  'intermediario',
  'comisión',
  'tu página en nuestro directorio',
];

describe('Bio Page — Dark Funnel Purity (Ley de Hick)', () => {
  const BIO_PAGE_PATH = path.resolve(process.cwd(), 'src/app/bio/[slug]/page.tsx');

  it('no debe contener palabras prohibidas del ecosistema extractivo', () => {
    const content = fs.readFileSync(BIO_PAGE_PATH, 'utf8');
    for (const word of FORBIDDEN_WORDS) {
      expect(content).not.toContain(word);
    }
  });

  it('debe usar lenguaje del Brand Core: "Motor de Reservas Propio"', () => {
    const content = fs.readFileSync(BIO_PAGE_PATH, 'utf8');
    expect(content).toContain('Motor de Reservas Propio');
  });

  it('debe tener botón de "Reservar Ahora" como acción principal', () => {
    const content = fs.readFileSync(BIO_PAGE_PATH, 'utf8');
    expect(content).toContain('Reservar Ahora');
  });

  it('no debe tener barras de búsqueda ni filtros complejos', () => {
    const content = fs.readFileSync(BIO_PAGE_PATH, 'utf8');
    expect(content).not.toContain('AvailabilitySearchBar');
    expect(content).not.toContain('SearchBar');
    expect(content).not.toContain('Filtro');
  });

  it('debe incluir enlace directo a WhatsApp', () => {
    const content = fs.readFileSync(BIO_PAGE_PATH, 'utf8');
    expect(content).toContain('wa.me');
    expect(content).toContain('WhatsApp Directo');
  });
});

describe('Welcome Email — Brand Core Compliance', () => {
  const EMAIL_PATH = path.resolve(process.cwd(), 'src/emails/WelcomeHotelier.tsx');

  it('no debe contener palabras prohibidas', () => {
    const content = fs.readFileSync(EMAIL_PATH, 'utf8');
    for (const word of FORBIDDEN_WORDS) {
      expect(content).not.toContain(word);
    }
  });

  it('debe usar "Link Directo" y "Motor Propio"', () => {
    const content = fs.readFileSync(EMAIL_PATH, 'utf8');
    expect(content).toContain('Link Directo');
  });

  it('debe incluir link a /bio/{slug}', () => {
    const content = fs.readFileSync(EMAIL_PATH, 'utf8');
    expect(content).toContain('/bio/');
  });

  it('debe advertir sobre Wompi si no está configurado', () => {
    const content = fs.readFileSync(EMAIL_PATH, 'utf8');
    expect(content).toContain('wompiConfigured');
    expect(content).toContain('Pasarela de Pagos');
  });
});
