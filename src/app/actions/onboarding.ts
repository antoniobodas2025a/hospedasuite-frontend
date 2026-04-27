'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';

// 🛡️ Cliente Administrativo (Tier-0) para ejecución atómica masiva
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 🧹 MOTOR DE PURGA ATÓMICA (CLEAN SLATE)
 * Destruye secuencialmente el grafo de datos sintéticos respetando la integridad referencial.
 */
export async function executeCleanSlateAction() {
  try {
    // 1. VALIDACIÓN ZERO-TRUST (El usuario solo puede purgar su propia jurisdicción)
    const hotel = await getCurrentHotel();
    if (!hotel) throw new Error('AUTH_ERROR: Contexto de hotel no encontrado.');

    const hotelId = hotel.id;

    // 2. OBTENCIÓN DE VECTORES DE RELACIÓN (Resolución de Llaves Foráneas)
    const [{ data: staff }, { data: bookings }] = await Promise.all([
      supabaseAdmin.from('staff').select('id').eq('hotel_id', hotelId),
      supabaseAdmin.from('bookings').select('id').eq('hotel_id', hotelId)
    ]);

    const staffIds = staff?.map(s => s.id) || [];
    const bookingIds = bookings?.map(b => b.id) || [];

    // 3. DESTRUCCIÓN CAPA 3 (Dependencias Transaccionales)
    if (bookingIds.length > 0) {
      const { error: posErr } = await supabaseAdmin.from('service_items').delete().in('booking_id', bookingIds);
      if (posErr) throw new Error(`POS_PURGE_ERROR: ${posErr.message}`);
    }

    if (staffIds.length > 0) {
      const { error: payErr } = await supabaseAdmin.from('payments').delete().in('staff_id', staffIds);
      if (payErr) throw new Error(`PAYMENTS_PURGE_ERROR: ${payErr.message}`);
    }

    // 4. DESTRUCCIÓN CAPA 2 (Reservas y Línea de Tiempo)
    const { error: bookErr } = await supabaseAdmin.from('bookings').delete().eq('hotel_id', hotelId);
    if (bookErr) throw new Error(`BOOKINGS_PURGE_ERROR: ${bookErr.message}`);

    // 5. DESTRUCCIÓN CAPA 1 (Identidades PII y Topología Física)
    const [{ error: guestsErr }, { error: roomsErr }] = await Promise.all([
      supabaseAdmin.from('guests').delete().eq('hotel_id', hotelId),
      supabaseAdmin.from('rooms').delete().eq('hotel_id', hotelId)
    ]);

    if (guestsErr) throw new Error(`GUESTS_PURGE_ERROR: ${guestsErr.message}`);
    if (roomsErr) throw new Error(`ROOMS_PURGE_ERROR: ${roomsErr.message}`);

    // 6. PURGA DE CACHÉ GLOBAL Y ACTUALIZACIÓN DE ESTADO
    revalidatePath('/', 'layout');

    return { 
      success: true, 
      message: 'Matriz purgada exitosamente. Clean Slate activado.' 
    };

  } catch (error: any) {
    console.error('🚨 CLEAN_SLATE_FORENSIC_ERROR:', error.message);
    return { success: false, error: error.message };
  }
}