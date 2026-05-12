// ============================================================================
// 🧪 Tests: generateSlug()
// ============================================================================

import { describe, it, expect } from 'vitest';
import { generateSlug } from '@/lib/slug';

describe('generateSlug', () => {
  it('🏷️ nombre simple → slug limpio', () => {
    expect(generateSlug('Hotel Panorama')).toBe('hotel-panorama');
  });

  it('🏷️ acentos: í, ó, ñ → i, o, n', () => {
    expect(generateSlug('María López Muñoz')).toBe('maria-lopez-munoz');
  });

  it('🏷️ & → y', () => {
    expect(generateSlug('Hotel & Spa')).toBe('hotel-y-spa');
  });

  it('🏷️ caracteres especiales eliminados', () => {
    expect(generateSlug('Hotel ★★★★★')).toBe('hotel');
    expect(generateSlug('Casa Bonita!')).toBe('casa-bonita');
  });

  it('🏷️ espacios extras colapsados', () => {
    expect(generateSlug('  Hotel   Amplio  ')).toBe('hotel-amplio');
  });

  it('🏷️ guiones al inicio/final eliminados', () => {
    expect(generateSlug('-hotel-')).toBe('hotel');
  });

  it('🏷️ string vacío → vacío', () => {
    expect(generateSlug('')).toBe('');
  });

  it('🏷️ solo caracteres especiales → vacío', () => {
    expect(generateSlug('!!!***')).toBe('');
  });

  it('🏷️ ü, é, à normalizados', () => {
    expect(generateSlug('Müller École À propos')).toBe('muller-ecole-a-propos');
  });
});
