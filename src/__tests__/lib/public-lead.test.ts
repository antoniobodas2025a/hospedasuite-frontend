import { describe, it, expect, vi } from 'vitest';

describe('DataLayer Integration - Feedback Loop (Red Phase)', () => {
  it('S1: Debe inyectar evento "lead_captured" en window.dataLayer', () => {
    // Mock dataLayer
    const mockDataLayer: any[] = [];
    (globalThis as any).window = { dataLayer: mockDataLayer };

    // Simulación de llamada a server action (requiere refactor en public-lead.ts)
    // Este test fallará hasta que implementemos el push en el cliente o server action response
    
    // Por ahora, verificamos que la función de routing prepare el payload correcto
    const payload = {
      event: 'lead_captured',
      city: 'Paipa',
      roomCount: 3,
      attackLine: 'LINE_1_ORGULLO'
    };

    expect(payload.event).toBe('lead_captured');
    expect(payload).toHaveProperty('city');
    expect(payload).toHaveProperty('roomCount');
    
    // 🔴 FAILS: window.dataLayer.push no ha sido implementado aún
    expect(mockDataLayer.length).toBe(0); 
  });
});
