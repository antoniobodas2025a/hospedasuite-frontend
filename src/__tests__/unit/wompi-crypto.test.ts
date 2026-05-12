// ============================================================================
// 🧪 Tests Unitarios: verifyWompiSignature()
//
// Verificación criptográfica de firmas Wompi.
// No necesita DB — función pura.
// ============================================================================

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyWompiSignature, type WompiEventPayload } from '@/lib/wompi-crypto';

/**
 * Helper: genera un payload FIRMADO válido para testing.
 * Wompi firma concatenando: data.transaction.status + data.transaction.id
 *                           + data.transaction.reference + data.transaction.amount_in_cents
 *                           + data.environment + timestamp + secret
 *
 * Estos son los properties típicos que envía Wompi.
 */
function createSignedPayload(
  overrides: Partial<WompiEventPayload> = {},
  secret = 'test_secret_123'
): WompiEventPayload {
  const base: WompiEventPayload = {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: 'tx-001',
        reference: 'booking-123',
        status: 'APPROVED',
        amount_in_cents: 50000,
      },
    },
    environment: 'test-env',
    signature: {
      properties: [
        'data.transaction.status',
        'data.transaction.id',
        'data.transaction.reference',
        'data.transaction.amount_in_cents',
        'environment',
        'timestamp',
      ],
      checksum: '', // se calcula abajo
    },
    timestamp: Math.floor(Date.now() / 1000),
    ...overrides,
  };

  // Reconstruir la cadena igual que Wompi
  let concat = '';
  for (const prop of base.signature.properties) {
    const keys = prop.split('.');
    let val: any = base;
    for (const k of keys) {
      val = val?.[k];
    }
    concat += val !== undefined && val !== null ? String(val) : '';
  }
  concat += secret;
  base.signature.checksum = crypto.createHash('sha256').update(concat, 'utf8').digest('hex');

  return base;
}

describe('verifyWompiSignature', () => {
  it('✅ firma válida → true', () => {
    const payload = createSignedPayload();
    expect(verifyWompiSignature(payload, 'test_secret_123')).toBe(true);
  });

  it('❌ secreto incorrecto → false', () => {
    const payload = createSignedPayload();
    expect(verifyWompiSignature(payload, 'wrong_secret')).toBe(false);
  });

  it('❌ payload manipulado (status cambiado) → false', () => {
    const payload = createSignedPayload();
    // Manipular el status DESPUÉS de firmar
    payload.data.transaction.status = 'DECLINED';
    expect(verifyWompiSignature(payload, 'test_secret_123')).toBe(false);
  });

  it('❌ payload caducado (timestamp viejo) → false', () => {
    const payload = createSignedPayload({
      timestamp: Math.floor(Date.now() / 1000) - 3600, // 1 hora atrás
    });
    expect(verifyWompiSignature(payload, 'test_secret_123')).toBe(false);
  });

  it('❌ payload malformado (sin signature) → false', () => {
    const payload = createSignedPayload();
    (payload as any).signature = undefined;
    expect(verifyWompiSignature(payload, 'test_secret_123')).toBe(false);
  });

  it('❌ signature.properties no es array → false', () => {
    const payload = createSignedPayload();
    (payload.signature as any).properties = 'not-an-array';
    expect(verifyWompiSignature(payload, 'test_secret_123')).toBe(false);
  });

  it('🛡️ replay attack dentro de ventana (5 min) → true', () => {
    // Payload firmado hace 4 minutos (dentro de la ventana de 5 min)
    const payload = createSignedPayload({
      timestamp: Math.floor(Date.now() / 1000) - 240,
    });
    expect(verifyWompiSignature(payload, 'test_secret_123')).toBe(true);
  });

  it('🛡️ timestamp futuro con drift menor a -60s → false', () => {
    const payload = createSignedPayload({
      timestamp: Math.floor(Date.now() / 1000) + 120, // 2 min en el futuro
    });
    expect(verifyWompiSignature(payload, 'test_secret_123')).toBe(false);
  });
});
