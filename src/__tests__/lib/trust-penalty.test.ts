import { describe, it, expect } from 'vitest';
import templates from '@/lib/klaviyo-templates.json';

describe('Mitigación del Trust Penalty (Brand Core OS)', () => {
  const forbiddenWords = [
    'OTA',
    'Online Travel Agency',
    'Campañas genéricas',
    'Montaje manual',
    'Tráfico orgánico tradicional',
    'unidades', // Debe ser "habitaciones"
    'intermediario', // Debe ser "Motor Propio" o similar
  ];

  it('S1: Los templates de Klaviyo NO deben contener palabras prohibidas', () => {
    const jsonContent = JSON.stringify(templates);

    // Debug: Print content to see what's being tested
    console.log('JSON Content:', jsonContent);

    forbiddenWords.forEach((word) => {
      // Case-insensitive check
      const regex = new RegExp(word, 'i');
      expect(jsonContent).not.toMatch(regex);
    });
  });

  it('S2: Los templates deben usar lenguaje de "Socio de Crecimiento"', () => {
    const orgulloLocalBody = templates.flows.orgullo_local.emails[0].body_html;
    const ceroRiesgoBody = templates.flows.cero_riesgo.emails[0].body_html;

    // Verificar presencia de términos de soberanía
    expect(orgulloLocalBody).toContain('Motor de Reservas Propio');
    expect(ceroRiesgoBody).toContain('Motor de Reservas');
    expect(orgulloLocalBody).toContain('Wompi');
  });
});
