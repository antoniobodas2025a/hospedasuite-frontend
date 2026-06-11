import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackLeadCaptured } from '@/lib/datalayer';
import { DarkFunnelJsonLd } from '@/components/seo/DarkFunnelJsonLd';
import fs from 'fs';
import path from 'path';

type GlobalWithWindow = typeof globalThis & { window?: Window & typeof globalThis };

// ============================================================================
// MUTATION TESTER: Trust Penalty — Forbidden Words
// ============================================================================

const FORBIDDEN_WORDS = [
  'Montaje manual',
  'Campañas genéricas',
  'Tráfico orgánico tradicional',
];

describe('Trust Penalty — Forbidden Words Mutation Tests', () => {
  const TEMPLATES_PATH = path.resolve(__dirname, '../../lib/klaviyo-templates.json');
  const DEPLOY_PATH = path.resolve(__dirname, '../../../scripts/deploy-klaviyo.js');

  it('klaviyo-templates.json debe estar libre de términos prohibidos', () => {
    const content = fs.readFileSync(TEMPLATES_PATH, 'utf8');
    for (const word of FORBIDDEN_WORDS) {
      expect(content).not.toContain(word);
    }
  });

  it('deploy-klaviyo.js debe estar libre de términos prohibidos', () => {
    const content = fs.readFileSync(DEPLOY_PATH, 'utf8');
    for (const word of FORBIDDEN_WORDS) {
      expect(content).not.toContain(word);
    }
  });
});

// ============================================================================
// FEEDBACK LOOP: DataLayer Integrity
// ============================================================================

describe('Dark Funnel — DataLayer Feedback Loop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as GlobalWithWindow).window;
  });

  it('debe crear window.dataLayer si no existe', () => {
    (globalThis as GlobalWithWindow).window = {} as unknown as Window & typeof globalThis;
    trackLeadCaptured('Paipa', 3, 'LINE_1_ORGULLO');
    expect((globalThis as GlobalWithWindow).window?.dataLayer).toBeDefined();
    expect((globalThis as GlobalWithWindow).window?.dataLayer?.length).toBe(1);
  });

  it('debe push el evento con las 3 variables obligatorias', () => {
    (globalThis as GlobalWithWindow).window = { dataLayer: [] } as unknown as Window & typeof globalThis;
    trackLeadCaptured('Villa de Leyva', 5, 'LINE_2_CERO_RIESGO');

    const event = (globalThis as GlobalWithWindow).window?.dataLayer?.[0];
    expect(event?.event).toBe('lead_captured');
    expect(event?.city).toBe('Villa de Leyva');
    expect(event?.roomCount).toBe(5);
    expect(event?.attack_line).toBe('LINE_2_CERO_RIESGO');
  });

  it('debe acumular múltiples eventos sin sobrescribir', () => {
    (globalThis as GlobalWithWindow).window = { dataLayer: [] } as unknown as Window & typeof globalThis;
    trackLeadCaptured('Paipa', 2, 'LINE_1_ORGULLO');
    trackLeadCaptured('Tunja', 8, 'LINE_2_CERO_RIESGO');

    expect((globalThis as GlobalWithWindow).window?.dataLayer?.length).toBe(2);
    expect((globalThis as GlobalWithWindow).window?.dataLayer?.[1]?.city).toBe('Tunja');
  });

  it('no debe hacer nada en servidor (window undefined)', () => {
    delete (globalThis as GlobalWithWindow).window;
    // No debe lanzar
    expect(() => trackLeadCaptured('Paipa', 3, 'LINE_1_ORGULLO')).not.toThrow();
  });
});

// ============================================================================
// GTM ID LEAKAGE
// ============================================================================

describe('GTM ID Integrity', () => {
  const LAYOUT_PATH = path.resolve(__dirname, '../../app/layout.tsx');

  it('layout.tsx NO debe contener GTM-XXXXXX', () => {
    const content = fs.readFileSync(LAYOUT_PATH, 'utf8');
    expect(content).not.toContain('GTM-XXXXXX');
  });

  it('layout.tsx debe contener GTM-W3VSWFMZ exactamente 2 veces', () => {
    const content = fs.readFileSync(LAYOUT_PATH, 'utf8');
    const matches = content.match(/GTM-W3VSWFMZ/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2);
  });
});

// ============================================================================
// JSON-LD DATASET INTEGRITY
// ============================================================================

describe('DarkFunnelJsonLd — Dataset Schema', () => {
  it('debe producir un objeto con @type: Dataset', () => {
    const element = DarkFunnelJsonLd();
    const html = element.props.dangerouslySetInnerHTML.__html;
    const schema = JSON.parse(html);
    expect(schema['@type']).toBe('Dataset');
  });

  it('debe contener keywords relacionados con GTM y Klaviyo', () => {
    const element = DarkFunnelJsonLd();
    const html = element.props.dangerouslySetInnerHTML.__html;
    const schema = JSON.parse(html);
    expect(schema.keywords).toContain('GTM');
    expect(schema.keywords).toContain('Klaviyo MCP');
    expect(schema.keywords).toContain('dark funnel analytics');
  });

  it('debe tener creator con nombre HospedaSuite', () => {
    const element = DarkFunnelJsonLd();
    const html = element.props.dangerouslySetInnerHTML.__html;
    const schema = JSON.parse(html);
    expect(schema.creator.name).toBe('HospedaSuite');
  });

  it('debe tener description no vacío', () => {
    const element = DarkFunnelJsonLd();
    const html = element.props.dangerouslySetInnerHTML.__html;
    const schema = JSON.parse(html);
    expect(schema.description.length).toBeGreaterThan(20);
  });
});
