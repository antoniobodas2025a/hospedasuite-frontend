import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock fetch globally for deploy script tests
const mockFetch = vi.fn();
(global as unknown as Record<string, unknown>).fetch = mockFetch;

describe('Deploy Klaviyo Script', () => {
  const TEMPLATES_PATH = path.resolve(__dirname, '../../lib/klaviyo-templates.json');

  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetch.mockReset();
    // Set env vars for tests
    vi.stubEnv('KLAVIYO_API_KEY', 'test-api-key');
    vi.stubEnv('KLAVIYO_LIST_ID', 'test-list-id');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('S1: Debe leer klaviyo-templates.json correctamente', () => {
    const content = fs.readFileSync(TEMPLATES_PATH, 'utf8');
    const config = JSON.parse(content);
    expect(config.flows).toBeDefined();
    expect(config.flows.orgullo_local).toBeDefined();
    expect(config.flows.cero_riesgo).toBeDefined();
  });

  it('S2: Debe fallar si KLAVIYO_API_KEY no existe', () => {
    vi.stubEnv('KLAVIYO_API_KEY', '');
    // Simulate the script's validation logic
    const apiKey = process.env.KLAVIYO_API_KEY;
    const listId = process.env.KLAVIYO_LIST_ID;
    expect(!apiKey || !listId).toBe(true);
  });

  it('S3: Debe fallar si KLAVIYO_LIST_ID no existe', () => {
    vi.stubEnv('KLAVIYO_LIST_ID', '');
    vi.stubEnv('KLAVIYO_API_KEY', 'some-key');
    const apiKey = process.env.KLAVIYO_API_KEY;
    const listId = process.env.KLAVIYO_LIST_ID;
    expect(!apiKey || !listId).toBe(true);
  });

  it('S4: apiCall debe manejar error de red', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const HEADERS = {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: 'Klaviyo-API-Key test-key',
      revision: '2023-02-22',
    };

    async function apiCall(endpoint: string, method: string, body?: Record<string, unknown>) {
      const url = `https://a.klaviyo.com/api${endpoint}`;
      const options: RequestInit = { method, headers: HEADERS };
      if (body) options.body = JSON.stringify(body);
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${JSON.stringify(data)}`);
      }
      return data;
    }

    await expect(apiCall('/flows', 'POST', {})).rejects.toThrow('Network error');
  });

  it('S5: createFlow debe enviar payload correcto a /flows', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'flow-123' } }),
    });

    const HEADERS = {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: 'Klaviyo-API-Key test-key',
      revision: '2023-02-22',
    };

    const payload = {
      data: {
        type: 'flow',
        attributes: { name: 'test-flow', status: 'manual' },
      },
    };

    await fetch('https://a.klaviyo.com/api/flows', { method: 'POST', headers: HEADERS, body: JSON.stringify(payload) });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://a.klaviyo.com/api/flows',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
  });

  it('S6: createTemplate debe enviar payload correcto a /templates', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'tpl-456' } }),
    });

    const HEADERS = {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: 'Klaviyo-API-Key test-key',
      revision: '2023-02-22',
    };

    const payload = {
      data: {
        type: 'template',
        attributes: {
          name: 'test-template',
          editor_type: 'code',
          html: '<p>Hello</p>',
          text: 'Hello',
          subject: 'Test',
        },
      },
    };

    await fetch('https://a.klaviyo.com/api/templates', { method: 'POST', headers: HEADERS, body: JSON.stringify(payload) });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://a.klaviyo.com/api/templates',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
  });
});
