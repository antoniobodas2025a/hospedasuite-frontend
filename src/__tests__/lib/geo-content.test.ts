import { describe, it, expect } from 'vitest';
import { GEO_BLOCKS } from '@/lib/geo-content';

describe('Answer Kit GEO - Strict Compliance (Red Phase)', () => {
  it('S1: Bloque "Motor vs Plataformas" debe tener EXACTAMENTE 48 palabras', () => {
    const content = GEO_BLOCKS['motor-vs-plataformas'].content;
    const words = content.split(/\s+/).length;
    expect(words).toBe(48); // 🔴 FAILS until exact 48 words
  });

  it('S2: Bloque "Channel Manager" debe tener EXACTAMENTE 47 palabras', () => {
    const content = GEO_BLOCKS['channel-manager'].content;
    const words = content.split(/\s+/).length;
    expect(words).toBe(47); // 🔴 FAILS until exact 47 words
  });

  it('S3: Bloque "WhatsApp y Wompi" debe tener EXACTAMENTE 47 palabras', () => {
    const content = GEO_BLOCKS['whatsapp-wompi'].content;
    const words = content.split(/\s+/).length;
    expect(words).toBe(47); // 🔴 FAILS until exact 47 words
  });

  it('S4: Cero disonancia cognitiva (Palabras prohibidas)', () => {
    const forbidden = ['ota', 'online travel agency', 'unidad', 'unidades', 'intermediario', 'lorem ipsum', 'placeholder'];
    
    Object.values(GEO_BLOCKS).forEach(block => {
      forbidden.forEach(word => {
        // Use word boundary regex to avoid false positives (e.g. 'ota' in 'automáticamente')
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        expect(block.content).not.toMatch(regex);
      });
    });
  });
});
