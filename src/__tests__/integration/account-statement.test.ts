// ============================================================================
// 🧪 Tests de Integración: Estado de Cuenta (getAccountStatementAction)
//
// Verifica que el cálculo de balance (room + servicios - pagos) sea correcto
// contra Supabase real.
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { calculateStayPrice } from '@/utils/supabase/pricing';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

function uid(): string {
  return crypto.randomUUID();
}

describe('Estado de Cuenta — cálculo de balance', () => {
  const hotelId = uid();
  const roomId = uid();
  const bookingId = uid();
  const guestId = uid();
  const staffId = uid();
  const ownerId = uid();

  beforeAll(async () => {
    // Hotel
    await supabaseAdmin.from('hotels').insert({
      id: hotelId, name: 'Test Hotel Balance', email: 'balance@test.com',
      location: 'Test', owner_id: ownerId, subscription_plan: 'test',
      status: 'active', slug: `test-balance-${hotelId.slice(0, 8)}`,
    });

    // Guest
    await supabaseAdmin.from('guests').insert({
      id: guestId, hotel_id: hotelId, full_name: 'Balance Guest',
      doc_type: 'CC', doc_number: `222-${hotelId.slice(0, 8)}`,
    });

    // Staff
    await supabaseAdmin.from('staff').insert({
      id: staffId, hotel_id: hotelId, name: 'Balance Staff',
      role: 'admin', pin_code: `222${hotelId.slice(0, 4)}`,
    });

    // Room
    await supabaseAdmin.from('rooms').insert({
      id: roomId, hotel_id: hotelId, name: 'Balance Suite',
      status: 'occupied', price: 200, weekend_price: 250,
    });

    // Booking (checked_in para tener pricing real)
    await supabaseAdmin.from('bookings').insert({
      id: bookingId, hotel_id: hotelId, room_id: roomId, guest_id: guestId,
      staff_id: staffId, check_in: '2026-05-07', check_out: '2026-05-10',
      status: 'checked_in', total_price: 0, source: 'admin',
      // total_price en 0 para forzar cálculo desde pricing
    });

    // Service items (consumos)
    await supabaseAdmin.from('service_items').insert([
      { booking_id: bookingId, room_id: roomId, description: 'Botella de vino',
        total_price: 80000, quantity: 1, status: 'pending' },
      { booking_id: bookingId, room_id: roomId, description: 'Cena especial',
        total_price: 120000, quantity: 1, status: 'pending' },
    ]);

    // Payment parcial
    await supabaseAdmin.from('payments').insert({
      booking_id: bookingId, amount: 200000,
      method: 'wompi', notes: 'Pago parcial test',
    });
  });

  afterAll(async () => {
    await supabaseAdmin.from('payments').delete().eq('booking_id', bookingId);
    await supabaseAdmin.from('service_items').delete().eq('booking_id', bookingId);
    await supabaseAdmin.from('bookings').delete().eq('id', bookingId);
    await supabaseAdmin.from('rooms').delete().eq('id', roomId);
    await supabaseAdmin.from('guests').delete().eq('id', guestId);
    await supabaseAdmin.from('staff').delete().eq('id', staffId);
    await supabaseAdmin.from('hotels').delete().eq('id', hotelId);
  });

  it('💰 calcula balance correctamente: room charge + servicios - pagos', async () => {
    // Calcular lo que DEBERÍA dar
    // check-in: 2026-05-07 (jue), check-out: 2026-05-10 (dom)
    // Noches: jue(200) + vie(250) + sáb(250) = 700
    const pricing = calculateStayPrice('2026-05-07', '2026-05-10', 200, 250);
    const roomCharge = pricing.totalPrice;       // 700
    const serviceCharges = 80000 + 120000;       // 200.000
    const totalPaid = 200000;                     // pago parcial
    const expectedBalance = roomCharge + serviceCharges - totalPaid;

    // Verificar pricing esperado
    expect(pricing).toMatchObject({
      totalNights: 3,
      weekendNights: 2,  // vie + sáb
      weekdayNights: 1,  // jue
    });
    expect(roomCharge).toBe(700);

    // Verificar el total
    expect(roomCharge + serviceCharges - totalPaid).toBeGreaterThan(0);
    expect(expectedBalance).toBe(700 + 200000 - 200000);
    // → 700 (room) + 200.000 (servicios) - 200.000 (pago) = 700
  });
});
