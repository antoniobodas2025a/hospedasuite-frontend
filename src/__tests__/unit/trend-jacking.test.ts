import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectLocation,
  detectCrisisTopic,
  detectNegativeSentiment,
  evaluateTrendPayload,
  BOYACA_CENTRO_CITIES,
  CRISIS_KEYWORDS,
  NEGATIVE_SENTIMENT_KEYWORDS,
} from '@/lib/trend-jacking';
import fs from 'fs';
import path from 'path';

// ============================================================================
// MUTATION TESTER: Brand Core — Forbidden Words
// ============================================================================

const FORBIDDEN_WORDS = [
  'Aprovechando tu desgracia',
  'Comisión OTA',
  'Te lo dijimos',
  'Campaña viral',
  'OTA',
];

describe('Trend-Jacking — Brand Core (Empathy Mutation Tests)', () => {
  const TREND_JACKING_PATH = path.resolve(process.cwd(), 'src/lib/trend-jacking.ts');
  const WEBHOOK_PATH = path.resolve(process.cwd(), 'src/app/api/trend-webhook/route.ts');
  const CRISIS_PAGE_PATH = path.resolve(process.cwd(), 'src/app/recursos/que-hacer-caida-plataformas-reservas/page.tsx');

  it('trend-jacking.ts debe estar libre de términos oportunistas', () => {
    const content = fs.readFileSync(TREND_JACKING_PATH, 'utf8');
    for (const word of FORBIDDEN_WORDS) {
      expect(content).not.toContain(word);
    }
  });

  it('trend-webhook route.ts debe estar libre de términos oportunistas', () => {
    const content = fs.readFileSync(WEBHOOK_PATH, 'utf8');
    for (const word of FORBIDDEN_WORDS) {
      expect(content).not.toContain(word);
    }
  });

  it('crisis page debe estar libre de términos oportunistas', () => {
    const content = fs.readFileSync(CRISIS_PAGE_PATH, 'utf8');
    for (const word of FORBIDDEN_WORDS) {
      expect(content).not.toContain(word);
    }
  });
});

// ============================================================================
// LOCATION DETECTION
// ============================================================================

describe('Trend-Jacking — Location Detection (Boyacá-Centro Hub)', () => {
  it('debe detectar Paipa en el texto', () => {
    expect(detectLocation('Hotel en Paipa sufre sobreventa masiva')).toBe('paipa');
  });

  it('debe detectar Villa de Leyva en el campo location', () => {
    expect(detectLocation('Queja de hotelero', 'Villa de Leyva')).toBe('villa de leyva');
  });

  it('debe retornar null si no es Boyacá-Centro', () => {
    expect(detectLocation('Hotel en Bogotá tiene problemas')).toBeNull();
  });

  it('debe detectar Duitama en texto largo', () => {
    const text = 'Soy hotelero en Duitama y la plataforma de reservas se cayó este fin de semana. Perdí 12 reservas.';
    expect(detectLocation(text)).toBe('duitama');
  });

  it('debe detectar todas las ciudades del hub', () => {
    for (const city of BOYACA_CENTRO_CITIES) {
      const result = detectLocation(`Hotel en ${city} con problemas`);
      expect(result).toBe(city);
    }
  });
});

// ============================================================================
// CRISIS TOPIC DETECTION
// ============================================================================

describe('Trend-Jacking — Crisis Topic Detection', () => {
  it('debe detectar sobreventa', () => {
    expect(detectCrisisTopic('Tuvimos una sobreventa terrible')).toBe(true);
  });

  it('debe detectar falla de plataforma', () => {
    expect(detectCrisisTopic('Se cayó el sistema de reservas')).toBe(true);
  });

  it('debe detectar retención de pagos', () => {
    expect(detectCrisisTopic('Me retuvieron los pagos de este mes')).toBe(true);
  });

  it('no debe detectar crisis en texto positivo', () => {
    expect(detectCrisisTopic('Mi hotel va muy bien este mes')).toBe(false);
  });

  it('debe detectar todas las keywords de crisis', () => {
    for (const keyword of CRISIS_KEYWORDS) {
      expect(detectCrisisTopic(keyword)).toBe(true);
    }
  });
});

// ============================================================================
// NEGATIVE SENTIMENT DETECTION
// ============================================================================

describe('Trend-Jacking — Negative Sentiment Detection', () => {
  it('debe detectar sentiment negativo provisto', () => {
    expect(detectNegativeSentiment('Todo bien', 'negative')).toBe(true);
  });

  it('debe detectar "terrible" en el texto', () => {
    expect(detectNegativeSentiment('El servicio es terrible')).toBe(true);
  });

  it('debe detectar "fraude" en el texto', () => {
    expect(detectNegativeSentiment('Esto parece un fraude')).toBe(true);
  });

  it('no debe detectar sentimiento negativo en texto neutral', () => {
    expect(detectNegativeSentiment('El hotel tiene 20 habitaciones')).toBe(false);
  });

  it('debe detectar todas las keywords de sentimiento negativo', () => {
    for (const keyword of NEGATIVE_SENTIMENT_KEYWORDS) {
      expect(detectNegativeSentiment(keyword)).toBe(true);
    }
  });
});

// ============================================================================
// FULL PAYLOAD EVALUATION
// ============================================================================

describe('Trend-Jacking — Full Payload Evaluation', () => {
  it('S1: Debe dispatchar cuando hay crisis + sentimiento negativo + Boyacá', () => {
    const result = evaluateTrendPayload({
      source: 'twitter',
      text: 'Terrible sobreventa en mi hotel de Paipa. La plataforma se cayó y perdí reservas.',
      location: 'Paipa',
      sentiment: 'negative',
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('dispatched');
    expect(result.klaviyo_triggered).toBe(true);
    expect(result.reason).toContain('paipa');
  });

  it('debe ignorar si no hay crisis topic', () => {
    const result = evaluateTrendPayload({
      source: 'twitter',
      text: 'Mi hotel en Paipa va muy bien este mes',
      location: 'Paipa',
    });

    expect(result.action).toBe('ignored');
    expect(result.klaviyo_triggered).toBeUndefined();
  });

  it('debe ignorar si no es Boyacá-Centro', () => {
    const result = evaluateTrendPayload({
      source: 'twitter',
      text: 'Terrible sobreventa en mi hotel de Medellín',
      location: 'Medellín',
      sentiment: 'negative',
    });

    expect(result.action).toBe('ignored');
    expect(result.reason).toBe('Not in Boyacá-Centro hub');
  });

  it('debe retornar invalid si el texto está vacío', () => {
    const result = evaluateTrendPayload({
      source: 'twitter',
      text: '',
    });

    expect(result.action).toBe('invalid');
    expect(result.reason).toBe('Empty text field');
  });

  it('debe retornar invalid si falta source', () => {
    const result = evaluateTrendPayload({
      source: '',
      text: 'Terrible sobreventa',
    });

    expect(result.action).toBe('invalid');
    expect(result.reason).toBe('Missing source field');
  });
});

// ============================================================================
// GEO BLOCK — Exact 45 Words (Answer Kit Protection)
// ============================================================================

describe('Crisis Page — GEO Block Word Count (Mutation Protection)', () => {
  const CRISIS_PAGE_PATH = path.resolve(process.cwd(), 'src/app/recursos/que-hacer-caida-plataformas-reservas/page.tsx');

  it('el bloque GEO debe tener exactamente 45 palabras', () => {
    const content = fs.readFileSync(CRISIS_PAGE_PATH, 'utf8');

    // Extract the GEO_CITATION constant
    const match = content.match(/const GEO_CITATION\s*=\s*['"]([^'"]+)['"]/);
    expect(match).not.toBeNull();

    const citation = match![1];
    const words = citation.split(/\s+/).filter((w) => w.length > 0);

    expect(words.length).toBe(45);

    // Mutation protection: 44 or 46 words must FAIL
    expect(words.length).not.toBeLessThan(45);
    expect(words.length).not.toBeGreaterThan(45);
  });

  it('el bloque GEO debe mencionar Motor de Reservas', () => {
    const content = fs.readFileSync(CRISIS_PAGE_PATH, 'utf8');
    expect(content).toContain('Motor de Reservas');
  });

  it('el bloque GEO no debe contener palabras prohibidas', () => {
    const content = fs.readFileSync(CRISIS_PAGE_PATH, 'utf8');
    const forbidden = ['OTA', 'comisión OTA', 'aprovechando', 'viral'];
    for (const word of forbidden) {
      expect(content.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });
});

// ============================================================================
// JSON-LD — HowTo + Article Schema
// ============================================================================

describe('Crisis Page — JSON-LD Schema Validation', () => {
  const CRISIS_PAGE_PATH = path.resolve(process.cwd(), 'src/app/recursos/que-hacer-caida-plataformas-reservas/page.tsx');

  it('debe contener esquema HowTo', () => {
    const content = fs.readFileSync(CRISIS_PAGE_PATH, 'utf8');
    expect(content).toContain("'@type': 'HowTo'");
  });

  it('debe contener esquema Article', () => {
    const content = fs.readFileSync(CRISIS_PAGE_PATH, 'utf8');
    expect(content).toContain("'@type': 'Article'");
  });

  it('el HowTo debe tener al menos 3 pasos', () => {
    const content = fs.readFileSync(CRISIS_PAGE_PATH, 'utf8');
    const howToStepMatches = content.match(/'@type': 'HowToStep'/g);
    expect(howToStepMatches).not.toBeNull();
    expect(howToStepMatches!.length).toBeGreaterThanOrEqual(3);
  });
});
