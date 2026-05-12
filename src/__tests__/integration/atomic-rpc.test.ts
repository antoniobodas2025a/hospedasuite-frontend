// ============================================================================
// 🧪 Tests de Integración: RPCs Atómicos Check-in / Check-out
//
// Ejecuta contra SUPABASE REAL. Cada test crea su propia data y la limpia.
//
// Requiere .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
//
// Ejecutar: npx vitest run src/__tests__/integration/
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// 1. CONFIGURACIÓN
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local'
  );
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

function uid(): string {
  return crypto.randomUUID();
}

const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

// ============================================================================
// Suite 1: atomic_check_in
// ============================================================================

describe('atomic_check_in', () => {
  const hotelId = uid();
  const roomId = uid();
  const bookingId = uid();
  const guestId = uid();
  const staffId = uid();
  const ownerId = uid();

  beforeAll(async () => {
    // 1. Hotel
    const { error: hErr } = await supabaseAdmin.from('hotels').insert({
      id: hotelId,
      name: 'Test Hotel CI',
      email: 'ci@test.com',
      location: 'Test Location',
      owner_id: ownerId,
      subscription_plan: 'test',
      status: 'active',
      slug: `test-hotel-ci-${hotelId.slice(0, 8)}`,
    });
    if (hErr) throw new Error(`Hotel: ${hErr.message}`);

    // 2. Guest (necesario para FK en booking)
    const { error: gErr } = await supabaseAdmin.from('guests').insert({
      id: guestId,
      hotel_id: hotelId,
      full_name: 'Test Guest CI',
      doc_type: 'CC',
      doc_number: `000-${hotelId.slice(0, 8)}`,
    });
    if (gErr) throw new Error(`Guest: ${gErr.message}`);

    // 3. Staff (necesario para FK en booking)
    const { error: sErr } = await supabaseAdmin.from('staff').insert({
      id: staffId,
      hotel_id: hotelId,
      name: 'Test Staff CI',
      role: 'admin',
      pin_code: `000${hotelId.slice(0, 4)}`,
    });
    if (sErr) throw new Error(`Staff: ${sErr.message}`);

    // 4. Room
    const { error: rErr } = await supabaseAdmin.from('rooms').insert({
      id: roomId,
      hotel_id: hotelId,
      name: 'Suite CI Test',
      status: 'clean',
      price: 150,
    });
    if (rErr) throw new Error(`Room: ${rErr.message}`);

    // 5. Booking (confirmed)
    const { error: bErr } = await supabaseAdmin.from('bookings').insert({
      id: bookingId,
      hotel_id: hotelId,
      room_id: roomId,
      guest_id: guestId,
      staff_id: staffId,
      check_in: today(),
      check_out: tomorrow(),
      status: 'confirmed',
      total_price: 300,
      source: 'admin',
    });
    if (bErr) throw new Error(`Booking: ${bErr.message}`);
  });

  afterAll(async () => {
    await supabaseAdmin.from('bookings').delete().eq('id', bookingId);
    await supabaseAdmin.from('rooms').delete().eq('id', roomId);
    await supabaseAdmin.from('guests').delete().eq('id', guestId);
    await supabaseAdmin.from('staff').delete().eq('id', staffId);
    await supabaseAdmin.from('hotels').delete().eq('id', hotelId);
  });

  it('✅ check-in exitoso: booking → checked_in, room → occupied', async () => {
    const { data, error } = await supabaseAdmin.rpc('atomic_check_in', {
      p_booking_id: bookingId,
    });

    expect(error).toBeNull();
    expect(data).toEqual({ success: true });

    // Verificar booking
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .single();

    expect(booking?.status).toBe('checked_in');

    // Verificar room
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('status')
      .eq('id', roomId)
      .single();

    expect(room?.status).toBe('occupied');
  });
});

// ============================================================================
// Suite 2: atomic_check_out
// ============================================================================

describe('atomic_check_out', () => {
  const hotelId = uid();
  const roomId = uid();
  const bookingId = uid();
  const guestId = uid();
  const staffId = uid();
  const ownerId = uid();

  beforeAll(async () => {
    // 1. Hotel
    const { error: hErr } = await supabaseAdmin.from('hotels').insert({
      id: hotelId,
      name: 'Test Hotel CO',
      email: 'co@test.com',
      location: 'Test Location',
      owner_id: ownerId,
      subscription_plan: 'test',
      status: 'active',
      slug: `test-hotel-co-${hotelId.slice(0, 8)}`,
    });
    if (hErr) throw new Error(`Hotel: ${hErr.message}`);

    // 2. Guest
    const { error: gErr } = await supabaseAdmin.from('guests').insert({
      id: guestId,
      hotel_id: hotelId,
      full_name: 'Test Guest CO',
      doc_type: 'CC',
      doc_number: `111-${hotelId.slice(0, 8)}`,
    });
    if (gErr) throw new Error(`Guest: ${gErr.message}`);

    // 3. Staff
    const { error: sErr } = await supabaseAdmin.from('staff').insert({
      id: staffId,
      hotel_id: hotelId,
      name: 'Test Staff CO',
      role: 'admin',
      pin_code: `111${hotelId.slice(0, 4)}`,
    });
    if (sErr) throw new Error(`Staff: ${sErr.message}`);

    // 4. Room (occupied)
    const { error: rErr } = await supabaseAdmin.from('rooms').insert({
      id: roomId,
      hotel_id: hotelId,
      name: 'Suite CO Test',
      status: 'occupied',
      price: 200,
    });
    if (rErr) throw new Error(`Room: ${rErr.message}`);

    // 5. Booking (checked_in)
    const { error: bErr } = await supabaseAdmin.from('bookings').insert({
      id: bookingId,
      hotel_id: hotelId,
      room_id: roomId,
      guest_id: guestId,
      staff_id: staffId,
      check_in: today(),
      check_out: tomorrow(),
      status: 'checked_in',
      total_price: 600,
      source: 'admin',
    });
    if (bErr) throw new Error(`Booking: ${bErr.message}`);
  });

  afterAll(async () => {
    await supabaseAdmin.from('bookings').delete().eq('id', bookingId);
    await supabaseAdmin.from('rooms').delete().eq('id', roomId);
    await supabaseAdmin.from('guests').delete().eq('id', guestId);
    await supabaseAdmin.from('staff').delete().eq('id', staffId);
    await supabaseAdmin.from('hotels').delete().eq('id', hotelId);
  });

  it('✅ checkout exitoso: booking → checked_out, room → dirty', async () => {
    const { data, error } = await supabaseAdmin.rpc('atomic_check_out', {
      p_booking_id: bookingId,
      p_room_id: roomId,
      p_service_ids: [],
    });

    expect(error).toBeNull();
    expect(data).toEqual({ success: true });

    // Verificar booking
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .single();

    expect(booking?.status).toBe('checked_out');

    // Verificar room
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('status')
      .eq('id', roomId)
      .single();

    expect(room?.status).toBe('dirty');
  });
});
