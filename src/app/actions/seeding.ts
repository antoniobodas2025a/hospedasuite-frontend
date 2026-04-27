'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 🛡️ INYECTOR SINTÉTICO V3 (POLIMÓRFICO + HIGH DENSITY)
 * @param targetHotelId Opcional. Si viene del SuperAdmin, inyecta en este ID.
 */
export async function injectDemoDataAction(targetHotelId?: string) {
  try {
    // 1. RESOLUCIÓN DE JURISDICCIÓN (Target Context Pattern)
    let hotelId = targetHotelId;
    
    if (!hotelId) {
      const hotelContext = await getCurrentHotel();
      hotelId = hotelContext?.id;
    }

    if (!hotelId) throw new Error('CONTEXT_MISSING: No se definió el hotel destino.');

    // 2. OBTENCIÓN DE STAFF (Para link financiero)
    const { data: staffList } = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('hotel_id', hotelId)
      .limit(1);

    const staffId = staffList?.[0]?.id;
    if (!staffId) throw new Error('STAFF_MISSING: El hotel debe tener al menos un empleado creado.');

    // 📅 3. CALIBRACIÓN TEMPORAL
    const today = new Date();
    const isoToday = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isoTomorrow = tomorrow.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isoYesterday = yesterday.toISOString().split('T')[0];

    // 🏨 4. INYECCIÓN DE TOPOLOGÍA (Física)
    const { data: rooms, error: roomsErr } = await supabaseAdmin.from('rooms').insert([
      { hotel_id: hotelId, name: 'Glamping Domo Estelar', status: 'occupied', price: 350000 },
      { hotel_id: hotelId, name: 'Glamping Domo Luna', status: 'dirty', price: 350000 },
      { hotel_id: hotelId, name: 'Cabaña Familiar Bosque', status: 'available', price: 550000 },
      { hotel_id: hotelId, name: 'Suite Panorámica', status: 'occupied', price: 450000 },
      { hotel_id: hotelId, name: 'Cabaña Rústica', status: 'maintenance', price: 250000 }
    ]).select('id, name');
    
    if (roomsErr) throw new Error('FALLO_ROOMS: ' + roomsErr.message);

    // 👤 5. INYECCIÓN DE IDENTIDAD (PII)
    const { data: guests, error: guestsErr } = await supabaseAdmin.from('guests').insert([
      { hotel_id: hotelId, full_name: 'Dr. Alejandro Gaviria', doc_number: '1020304050', phone: '3105550011', doc_type: 'CC' },
      { hotel_id: hotelId, full_name: 'Ing. Sofia Vergara', doc_number: '1098765432', phone: '3205550022', doc_type: 'CC' },
      { hotel_id: hotelId, full_name: 'Carlos Vives', doc_number: '19876543', phone: '3005550033', doc_type: 'CC' }
    ]).select('id, full_name');

    if (guestsErr) throw new Error('FALLO_GUESTS: ' + guestsErr.message);

    // 🗓️ 6. INYECCIÓN DE MATRIZ DE RESERVAS (BOOKINGS)
    const { data: bookings, error: bookingsErr } = await supabaseAdmin.from('bookings').insert([
      { hotel_id: hotelId, room_id: rooms[0].id, guest_id: guests[0].id, staff_id: staffId, check_in: isoToday, check_out: isoTomorrow, status: 'checked_in', total_price: 350000, source: 'direct' },
      { hotel_id: hotelId, room_id: rooms[3].id, guest_id: guests[1].id, staff_id: staffId, check_in: isoYesterday, check_out: isoTomorrow, status: 'checked_in', total_price: 900000, source: 'ota' },
      { hotel_id: hotelId, room_id: rooms[2].id, guest_id: guests[2].id, staff_id: staffId, check_in: isoTomorrow, check_out: '2027-01-01', status: 'confirmed', total_price: 550000, source: 'direct' }
    ]).select('id');

    if (bookingsErr) throw new Error('FALLO_BOOKINGS: ' + bookingsErr.message);

    // 💰 7. INYECCIÓN DE LEDGER POS (Cargos)
    const { error: posErr } = await supabaseAdmin.from('service_items').insert([
      { booking_id: bookings[0].id, room_id: rooms[0].id, description: 'POS: 2x Botella Vino Tinto | 1x Tabla Quesos', total_price: 180000, quantity: 1, status: 'pending' },
      { booking_id: bookings[1].id, room_id: rooms[3].id, description: 'POS: 2x Desayuno Glamping | 2x Masaje Spa', total_price: 320000, quantity: 1, status: 'pending' }
    ]);

    if (posErr) throw new Error('FALLO_POS: ' + posErr.message);

    // 💵 8. INYECCIÓN DE CAJA (Pagos vinculados)
    const { error: walkInErr } = await supabaseAdmin.from('payments').insert([
      { booking_id: bookings[0].id, amount: 45000, method: 'cash', notes: 'Pago POS: 3x Cerveza Artesanal', staff_id: staffId },
      { booking_id: bookings[1].id, amount: 120000, method: 'card', notes: 'Abono POS: Consumos Extra', staff_id: staffId }
    ]);

    if (walkInErr) throw new Error('FALLO_PAGOS: ' + walkInErr.message);

    revalidatePath('/', 'layout');
    return { success: true, message: 'Topología Comercial Inyectada Exitosamente.' };
  } catch (error: any) {
    console.error('🚨 SEEDING_ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🧹 PROTOCOLO CLEAN SLATE (RESETEO DE TENANT)
 * Borra data operativa preservando el nodo de identidad (Admin) para evitar lockout.
 */
export async function executeCleanSlateAction(hotelId: string) {
  try {
    console.log(`🧹 Ejecutando Clean Slate para el Tenant: ${hotelId}`);

    // Obtenemos los IDs de las reservas para limpieza selectiva de tablas hijas
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('hotel_id', hotelId);

    const bookingIds = bookings?.map(b => b.id) || [];

    if (bookingIds.length > 0) {
      // 1. Borrar transacciones financieras y consumos vinculados
      await supabaseAdmin.from('service_items').delete().in('booking_id', bookingIds);
      await supabaseAdmin.from('payments').delete().in('booking_id', bookingIds);
      
      // 2. Borrar Matriz de Reservas
      await supabaseAdmin.from('bookings').delete().in('id', bookingIds);
    }

    // 3. Borrar Datos Maestros operativos
    await supabaseAdmin.from('guests').delete().eq('hotel_id', hotelId);
    await supabaseAdmin.from('inventory').delete().eq('hotel_id', hotelId);
    
    // 4. 🛡️ FILTRO DE PRESERVACIÓN DE IDENTIDAD (CRÍTICO)
    // Purgamos staff secundario pero mantenemos al Dueño (admin) para evitar orfandad de sesión.
    await supabaseAdmin
      .from('staff')
      .delete()
      .eq('hotel_id', hotelId)
      .neq('role', 'admin'); 

    // 5. Borrar Topología Física (Disparador Semántico del Wizard)
    await supabaseAdmin.from('rooms').delete().eq('hotel_id', hotelId);

    // Revalidación total de la caché para forzar redirección
    revalidatePath('/', 'layout');
    
    return { success: true, message: 'Estado Cero alcanzado. Identidad preservada.' };
  } catch (error: any) {
    console.error('❌ Error en Clean Slate:', error.message);
    return { success: false, error: error.message };
  }
}