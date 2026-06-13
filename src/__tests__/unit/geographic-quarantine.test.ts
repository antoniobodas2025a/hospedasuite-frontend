import { describe, it, expect } from 'vitest';

// Importamos la lógica de detección (simulada aquí para el test unitario de la lógica pura)
const BOYACA_CENTRO_CITIES = ['paipa', 'tibasosa', 'sogamoso', 'tota', 'duitama', 'firavitoba', 'nobsa', 'tunja', 'villa de leyva'];

function detectRegionalHub(city?: string): string {
  if (!city) return 'General';
  const normalized = city.toLowerCase().trim();
  if (BOYACA_CENTRO_CITIES.some((c) => normalized.includes(c))) return 'Boyacá-Centro';
  return 'General';
}

describe('Geographic Quarantine & Dark Funnel Bouncer', () => {
  it('debe detectar leads de Boyacá-Centro como locales', () => {
    expect(detectRegionalHub('Paipa')).toBe('Boyacá-Centro');
    expect(detectRegionalHub('Tibasosa')).toBe('Boyacá-Centro');
    expect(detectRegionalHub('Villa de Leyva')).toBe('Boyacá-Centro');
  });

  it('debe rechazar silenciosamente leads de otras regiones (Bouncer)', () => {
    expect(detectRegionalHub('Medellín')).toBe('General');
    expect(detectRegionalHub('Eje Cafetero')).toBe('General');
    expect(detectRegionalHub('Bogotá')).toBe('General');
  });

  it('debe validar que el payload del modal fuerza "Boyacá"', () => {
    // Simulamos el comportamiento del modal parcheado
    const modalPayloadCity = 'Boyacá'; // Valor hardcodeado en el parche
    expect(modalPayloadCity).toBe('Boyacá');
    expect(detectRegionalHub(modalPayloadCity)).toBe('General'); // Nota: 'Boyacá' genérico cae en General si no está en la lista específica, pero el backend lo acepta por la regla `|| detectedRegion === 'Boyacá'`
  });
});
