import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pushToKlaviyoMcp } from '@/lib/klaviyo-mcp';
import fs from 'fs';
import path from 'path';

describe('Klaviyo Integration - Real Data Flow (Green Phase)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Mock fetch global
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => ({}) }));
    // Mock env var
    vi.stubEnv('KLAVIYO_API_KEY', 'test-key-123');
  });

  it('S1: Debe llamar a la API de Klaviyo con el payload correcto', async () => {
    const payload = {
      email: 'test@hotel.com',
      phone: '+573001234567',
      properties: {
        city: 'Paipa',
        roomCount: 3,
        attackLine: 'LINE_1_ORGULLO',
      },
    };

    await pushToKlaviyoMcp(payload);

    expect(fetch).toHaveBeenCalledWith(
      'https://a.klaviyo.com/api/profile-subscriptions/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Klaviyo-API-Key test-key-123',
          'revision': '2023-02-22',
        }),
        body: expect.stringContaining('test@hotel.com'),
      })
    );
  });

  it('S2: Debe retornar error si KLAVIYO_API_KEY no existe', async () => {
    vi.stubEnv('KLAVIYO_API_KEY', '');
    const result = await pushToKlaviyoMcp({
      email: 'test@hotel.com',
      properties: { roomCount: 2, attackLine: 'LINE_1_ORGULLO' },
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Missing API Key');
  });

  it('S3: No debe crashear si city es undefined', async () => {
    const result = await pushToKlaviyoMcp({
      email: 'test@hotel.com',
      properties: { roomCount: 3, attackLine: 'LINE_1_ORGULLO' },
    });
    expect(result.success).toBe(true);
  });

  it('S4: Debe aceptar roomCount = 0', async () => {
    const result = await pushToKlaviyoMcp({
      email: 'test@hotel.com',
      properties: { roomCount: 0, attackLine: 'LINE_2_CERO_RIESGO' },
    });
    expect(result.success).toBe(true);
  });

  it('S5: No debe crashear si attack_line está vacío', async () => {
    const result = await pushToKlaviyoMcp({
      email: 'test@hotel.com',
      properties: { roomCount: 2, attackLine: '' },
    });
    expect(result.success).toBe(true);
  });

  it('S6: Debe retornar error si fetch lanza excepción de red', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
    const result = await pushToKlaviyoMcp({
      email: 'test@hotel.com',
      properties: { roomCount: 3, attackLine: 'LINE_1_ORGULLO' },
    });
    expect(result.success).toBe(false);
  });

  it('S7: Debe retornar error si Klaviyo responde 401', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 401, json: () => ({ error: 'Unauthorized' }) })
    );
    const result = await pushToKlaviyoMcp({
      email: 'test@hotel.com',
      properties: { roomCount: 3, attackLine: 'LINE_1_ORGULLO' },
    });
    expect(result.success).toBe(false);
  });

  it('S8: Klaviyo templates JSON es parseable y tiene 2 flujos', () => {
    const TEMPLATES_PATH = path.resolve(__dirname, '../../lib/klaviyo-templates.json');
    const content = fs.readFileSync(TEMPLATES_PATH, 'utf8');
    const config = JSON.parse(content);
    expect(config.flows).toBeDefined();
    expect(Object.keys(config.flows).length).toBe(2);
    expect(config.flows.orgullo_local).toBeDefined();
    expect(config.flows.cero_riesgo).toBeDefined();
  });
});
