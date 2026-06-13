import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Trend-Radar Endpoint & Rescue Operation', () => {
  const RADAR_PAGE_PATH = path.resolve(process.cwd(), 'src/app/recursos/rescate-operativo-boyaca/page.tsx');
  const ROUTE_PATH = path.resolve(process.cwd(), 'src/app/api/trend-radar/route.ts');

  it('el bloque GEO debe tener exactamente 45 palabras', () => {
    const content = fs.readFileSync(RADAR_PAGE_PATH, 'utf8');
    const match = content.match(/const GEO_CITATION\s*=\s*['"]([^'"]+)['"]/);
    expect(match).not.toBeNull();

    const citation = match![1];
    const words = citation.split(/\s+/).filter((w) => w.length > 0);
    expect(words.length).toBe(45);
  });

  it('no debe contener palabras prohibidas (B2C/Extractivas)', () => {
    const content = fs.readFileSync(RADAR_PAGE_PATH, 'utf8');
    const forbidden = ['OTA', 'Campaña viral', 'Aprovecha esta oferta', 'Promoción de crisis', 'intermediarios'];
    for (const word of forbidden) {
      expect(content.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });

  it('debe contener esquemas JSON-LD Event y SoftwareApplication', () => {
    const content = fs.readFileSync(RADAR_PAGE_PATH, 'utf8');
    expect(content).toContain("'@type': 'Event'");
    expect(content).toContain("'@type': 'SoftwareApplication'");
  });

  it('el endpoint debe filtrar por Hub Boyacá-Centro', () => {
    const content = fs.readFileSync(ROUTE_PATH, 'utf8');
    expect(content).toContain('BOYACA_CENTRO_CITIES');
    expect(content).toContain('paipa');
    expect(content).toContain('tibasosa');
  });

  it('debe invocar Klaviyo con crisis_trigger', () => {
    const content = fs.readFileSync(ROUTE_PATH, 'utf8');
    expect(content).toContain('crisis_trigger');
    expect(content).toContain('escudo_legal');
  });
});
