// ============================================================================
// 🧪 Tests Unitarios: generateIcalToken()
//
// Función pura — genera un token UUID para la exportación iCal.
// No necesita DB ni mocks.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { generateIcalToken } from '@/app/actions/inventory';

describe('generateIcalToken', () => {
  it('genera un string no vacío', async () => {
    const token = await generateIcalToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('genera un UUID válido (formato 8-4-4-4-12)', async () => {
    const token = await generateIcalToken();
    // UUID v4: xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(token).toMatch(uuidRegex);
  });

  it('genera tokens diferentes en llamadas sucesivas', async () => {
    const token1 = await generateIcalToken();
    const token2 = await generateIcalToken();
    expect(token1).not.toBe(token2);
  });
});
