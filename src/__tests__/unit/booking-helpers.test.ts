// ============================================================================
// 🧪 Test: isTemporalCollision — colisiones de booking detectadas desde errores PG
// ============================================================================

import { describe, it, expect } from 'vitest';
import { isTemporalCollision, type PostgresError } from '@/lib/booking-helpers';

describe('isTemporalCollision', () => {
  it('retorna true cuando el mensaje incluye no_overlapping_bookings', () => {
    const error: PostgresError = {
      message: 'violates exclusion constraint "no_overlapping_bookings"',
      code: '23P01',
    };
    expect(isTemporalCollision(error)).toBe(true);
  });

  it('retorna true cuando el mensaje incluye prevent_double_booking', () => {
    const error: PostgresError = {
      message: 'duplicate key value violates prevent_double_booking',
      code: '23505',
    };
    expect(isTemporalCollision(error)).toBe(true);
  });

  it('retorna true cuando el código es 23P04 (exclusion_violation)', () => {
    const error: PostgresError = {
      message: 'could not serialize access due to concurrent update',
      code: '23P04',
    };
    expect(isTemporalCollision(error)).toBe(true);
  });

  it('retorna false cuando el código no es de colisión', () => {
    const error: PostgresError = {
      message: 'relation "bookings" does not exist',
      code: '42P01',
    };
    expect(isTemporalCollision(error)).toBe(false);
  });

  it('retorna false para null', () => {
    expect(isTemporalCollision(null)).toBe(false);
  });

  it('retorna false para undefined', () => {
    expect(isTemporalCollision(undefined)).toBe(false);
  });

  it('retorna false cuando message es undefined', () => {
    const error: PostgresError = { code: '23505' };
    expect(isTemporalCollision(error)).toBe(false);
  });

  it('retorna false para un Error estándar sin código PG', () => {
    const error = new Error('Algo falló');
    expect(isTemporalCollision(error)).toBe(false);
  });
});
