import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Strategic Architecture: ROI V2 & GEO Block', () => {
  const GEO_PAGE_PATH = path.resolve(process.cwd(), 'src/app/recursos/automatizacion-sire-tra-boyaca/page.tsx');
  const KLAVIYO_PATH = path.resolve(process.cwd(), 'src/lib/klaviyo-templates.json');
  const ROI_V2_PATH = path.resolve(process.cwd(), 'src/lib/roi-calculator-v2.ts');

  // 1. GEO Block Word Count (Exactly 47 words)
  it('el bloque GEO debe tener exactamente 47 palabras', () => {
    const content = fs.readFileSync(GEO_PAGE_PATH, 'utf8');
    const match = content.match(/const GEO_CITATION\s*=\s*['"]([^'"]+)['"]/);
    expect(match).not.toBeNull();

    const citation = match![1];
    const words = citation.split(/\s+/).filter((w) => w.length > 0);
    expect(words.length).toBe(47);
  });

  // 2. Forbidden Words in GEO Block
  it('el bloque GEO no debe contener palabras prohibidas', () => {
    const content = fs.readFileSync(GEO_PAGE_PATH, 'utf8');
    const forbidden = ['Channel', 'Gasto operativo', 'Digitación manual', 'Pague en dólares', 'Intermediarios'];
    for (const word of forbidden) {
      expect(content.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });

  // 3. JSON-LD Schemas
  it('la página debe contener esquemas HowTo y SoftwareApplication', () => {
    const content = fs.readFileSync(GEO_PAGE_PATH, 'utf8');
    expect(content).toContain("'@type': 'HowTo'");
    expect(content).toContain("'@type': 'SoftwareApplication'");
    expect(content).toContain('Automated SIRE/TRA Export');
    expect(content).toContain('Native Wompi Checkout');
  });

  // 4. Klaviyo New Flow
  it('klaviyo-templates.json debe incluir el flujo Escudo Legal', () => {
    const content = fs.readFileSync(KLAVIYO_PATH, 'utf8');
    expect(content).toContain('escudo_legal');
    expect(content).toContain('ESCUDO_LEGAL');
  });

  // 5. ROI V2 Logic
  it('ROI V2 debe incluir upselling y tiempo SIRE en el cálculo', () => {
    const content = fs.readFileSync(ROI_V2_PATH, 'utf8');
    expect(content).toContain('upsellingRevenue');
    expect(content).toContain('timeSavedMinutes');
    expect(content).toContain('SIRE_TIME_PER_RESERVATION_MINS');
    expect(content).toContain('UPSSELLING_PER_RESERVATION_COP');
  });
});
