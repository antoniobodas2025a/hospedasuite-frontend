// ============================================================================
// 🧪 Tests Unitarios: iCal Sync Diff Algorithm
//
// Verifica la lógica de comparación entre eventos iCal y reservas existentes:
// - UID en iCal pero NO en DB → NUEVA reserva Channel → INSERT
// - UID en DB pero NO en iCal → CANCELADA en Channel → UPDATE status
// - UID en ambos → Sin cambios (skip)
// ============================================================================

import { describe, it, expect } from 'vitest';

// Simulación del diff algorithm (extraído de sync-hotel/route.ts para testing)
interface IcalEvent {
  uid: string;
  start: Date;
  end: Date;
}

interface ExistingBooking {
  id: string;
  room_id: string;
  status: string;
}

type DiffResult = {
  toCreate: IcalEvent[];
  toCancel: ExistingBooking[];
  unchanged: number;
};

function computeDiff(
  icalEvents: IcalEvent[],
  existingBookings: Map<string, ExistingBooking>,
  today: string
): DiffResult {
  const toCreate: IcalEvent[] = [];
  const unchanged: number = 0;
  const uidsFromIcal = new Set<string>();

  for (const event of icalEvents) {
    uidsFromIcal.add(event.uid);

    const checkIn = event.start.toISOString().split('T')[0];
    const checkOut = event.end.toISOString().split('T')[0];

    if (checkOut <= today) continue; // Ignorar eventos pasados

    const existing = existingBookings.get(event.uid);

    if (!existing) {
      toCreate.push(event);
    }
    // else: unchanged
  }

  const toCancel: ExistingBooking[] = [];
  for (const [externalId, booking] of existingBookings.entries()) {
    if (!uidsFromIcal.has(externalId)) {
      toCancel.push(booking);
    }
  }

  return {
    toCreate,
    toCancel,
    unchanged: icalEvents.length - toCreate.length - icalEvents.filter(e => {
      const checkOut = e.end.toISOString().split('T')[0];
      return checkOut <= today;
    }).length,
  };
}

describe('iCal Sync Diff Algorithm', () => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  describe('Nueva reserva Channel (UID en iCal pero NO en DB)', () => {
    it('detecta evento nuevo para crear', () => {
      const icalEvents: IcalEvent[] = [
        {
          uid: 'booking-123@booking.com',
          start: new Date(tomorrow),
          end: new Date(nextWeek),
        },
      ];
      const existingBookings = new Map<string, ExistingBooking>();

      const result = computeDiff(icalEvents, existingBookings, today);

      expect(result.toCreate).toHaveLength(1);
      expect(result.toCreate[0].uid).toBe('booking-123@booking.com');
      expect(result.toCancel).toHaveLength(0);
    });

    it('detecta múltiples eventos nuevos', () => {
      const icalEvents: IcalEvent[] = [
        { uid: 'uid-1', start: new Date(tomorrow), end: new Date(nextWeek) },
        { uid: 'uid-2', start: new Date(tomorrow), end: new Date(nextWeek) },
        { uid: 'uid-3', start: new Date(tomorrow), end: new Date(nextWeek) },
      ];
      const existingBookings = new Map<string, ExistingBooking>();

      const result = computeDiff(icalEvents, existingBookings, today);

      expect(result.toCreate).toHaveLength(3);
    });
  });

  describe('Reserva cancelada en Channel (UID en DB pero NO en iCal)', () => {
    it('detecta reserva para cancelar', () => {
      const icalEvents: IcalEvent[] = [];
      const existingBookings = new Map<string, ExistingBooking>();
      existingBookings.set('booking-456@booking.com', {
        id: 'db-booking-1',
        room_id: 'room-1',
        status: 'blocked_ota',
      });

      const result = computeDiff(icalEvents, existingBookings, today);

      expect(result.toCancel).toHaveLength(1);
      expect(result.toCancel[0].id).toBe('db-booking-1');
    });

    it('detecta múltiples cancelaciones', () => {
      const icalEvents: IcalEvent[] = [];
      const existingBookings = new Map<string, ExistingBooking>();
      existingBookings.set('uid-1', { id: 'b1', room_id: 'r1', status: 'blocked_ota' });
      existingBookings.set('uid-2', { id: 'b2', room_id: 'r2', status: 'blocked_ota' });

      const result = computeDiff(icalEvents, existingBookings, today);

      expect(result.toCancel).toHaveLength(2);
    });
  });

  describe('Sin cambios (UID en ambos)', () => {
    it('no crea ni cancela cuando UID coincide', () => {
      const sharedUid = 'booking-789@airbnb.com';
      const icalEvents: IcalEvent[] = [
        { uid: sharedUid, start: new Date(tomorrow), end: new Date(nextWeek) },
      ];
      const existingBookings = new Map<string, ExistingBooking>();
      existingBookings.set(sharedUid, {
        id: 'db-booking-2',
        room_id: 'room-2',
        status: 'blocked_ota',
      });

      const result = computeDiff(icalEvents, existingBookings, today);

      expect(result.toCreate).toHaveLength(0);
      expect(result.toCancel).toHaveLength(0);
    });
  });

  describe('Eventos pasados (checkOut <= today)', () => {
    it('ignora eventos que ya terminaron', () => {
      const icalEvents: IcalEvent[] = [
        { uid: 'old-booking', start: new Date(yesterday), end: new Date(today) },
      ];
      const existingBookings = new Map<string, ExistingBooking>();

      const result = computeDiff(icalEvents, existingBookings, today);

      expect(result.toCreate).toHaveLength(0);
    });
  });

  describe('Escenario mixto (creaciones + cancelaciones + sin cambios)', () => {
    it('procesa correctamente un sync realista', () => {
      // iCal tiene: nuevo, existente, existente
      const icalEvents: IcalEvent[] = [
        { uid: 'new-booking', start: new Date(tomorrow), end: new Date(nextWeek) },
        { uid: 'existing-1', start: new Date(tomorrow), end: new Date(nextWeek) },
        { uid: 'existing-2', start: new Date(tomorrow), end: new Date(nextWeek) },
      ];

      // DB tiene: existente-1, existente-2, cancelado
      const existingBookings = new Map<string, ExistingBooking>();
      existingBookings.set('existing-1', { id: 'b1', room_id: 'r1', status: 'blocked_ota' });
      existingBookings.set('existing-2', { id: 'b2', room_id: 'r2', status: 'blocked_ota' });
      existingBookings.set('cancelled-booking', { id: 'b3', room_id: 'r3', status: 'blocked_ota' });

      const result = computeDiff(icalEvents, existingBookings, today);

      expect(result.toCreate).toHaveLength(1);
      expect(result.toCreate[0].uid).toBe('new-booking');
      expect(result.toCancel).toHaveLength(1);
      expect(result.toCancel[0].id).toBe('b3');
    });
  });

  describe('iCal vacío', () => {
    it('cancela todas las reservas Channel existentes', () => {
      const icalEvents: IcalEvent[] = [];
      const existingBookings = new Map<string, ExistingBooking>();
      existingBookings.set('uid-1', { id: 'b1', room_id: 'r1', status: 'blocked_ota' });
      existingBookings.set('uid-2', { id: 'b2', room_id: 'r2', status: 'blocked_ota' });

      const result = computeDiff(icalEvents, existingBookings, today);

      expect(result.toCreate).toHaveLength(0);
      expect(result.toCancel).toHaveLength(2);
    });
  });
});
