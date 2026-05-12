// ============================================================================
// 🧪 Test Estructural: Room type incluye ical_export_token
//
// Verifica que la interfaz Room exponga el campo necesario para la
// exportación iCal pública. Sin este campo, el backend de iCal queda
// sin tipado en el frontend.
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Room } from '@/types';

describe('Room interface', () => {
  it('expone ical_export_token como string opcional', () => {
    // Construir un objeto Room con el nuevo campo
    const room: Room = {
      id: 'room-1',
      hotel_id: 'hotel-1',
      name: 'Suite Del Mar',
      price: 250,
      status: 'active',
      ical_export_token: 'abc-123-token',
    };

    // Verificar que el valor se conserva
    expect(room.ical_export_token).toBe('abc-123-token');
  });

  it('permite ical_export_token ausente (undefined)', () => {
    // room sin token — no debería causar error de compilación
    const room: Room = {
      id: 'room-2',
      hotel_id: 'hotel-1',
      name: 'Suite Sin Token',
      price: 180,
      status: 'active',
    };

    expect(room.ical_export_token).toBeUndefined();
  });
});
