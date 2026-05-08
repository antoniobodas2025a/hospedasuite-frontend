'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';
import { cookies } from 'next/headers';

// 🛡️ CLIENTE PRIVILEGIADO GLOBAL (Admin Tier)
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ==========================================
// BLOQUE 1: INTERFACES Y CONTRATOS
// ==========================================

interface BookingPayload {
  hotel_id: string;
  type: 'booking' | 'maintenance';
  guestName?: string;
  guestDoc?: string;
  guestPhone?: string;
  guestEmail?: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  price: number;
  source?: 'direct' | 'ota' | 'admin';
}

interface PendingBookingPayload {
  fullName: string;
  email: string;
  phone: string;
  document: string;
  roomId: string;
  checkin: string;
  checkout: string;
  source: 'direct' | 'ota';
  upsells: string[];
  amount: number; 
}

// ==========================================
// BLOQUE 2: UTILIDADES DE AUDITORÍA
// ==========================================

async function getActiveStaffId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const staffCookie = cookieStore.get('hospeda_staff_session');
    if (staffCookie) {
      const staffData = JSON.parse(staffCookie.value);
      return staffData.id || null;
    }
  } catch (error) {
    console.warn('Fallo al parsear la sesión del staff:', error);
  }
  return null;
}

/**
 * 🛡️ HELPER: Verificador de Colisión Temporal
 * Mapea las restricciones de exclusión de PostgreSQL al lenguaje del Frontend.
 */
const isTemporalCollision = (error: any): boolean => {
  if (!error) return false;
  return (
    error.message?.includes('no_overlapping_bookings') || 
    error.message?.includes('prevent_double_booking') || 
    error.code === '23P04'
  );
};

// ==========================================
// BLOQUE 3: ACCIONES CORE (ADMIN)
// ==========================================

export async function updateBookingDetailsAction(bookingId: string, data: any) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('guest_id')
      .eq('id', bookingId)
      .eq('hotel_id', currentHotel.id)
      .single();

    if (fetchError || !booking) throw new Error('Reserva no localizada.');

    if (booking.guest_id) {
      const { error: guestError } = await supabaseAdmin
        .from('guests')
        .update({
          full_name: data.guestName,
          doc_number: data.guestDoc,
          phone: data.guestPhone,
          email: data.guestEmail,
        })
        .eq('id', booking.guest_id)
        .eq('hotel_id', currentHotel.id);

      if (guestError) throw new Error('Fallo al actualizar huésped: ' + guestError.message);
    }

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        total_price: data.price,
        check_in: data.checkIn,
        check_out: data.checkOut,
        room_id: data.roomId,
      })
      .eq('id', bookingId)
      .eq('hotel_id', currentHotel.id);

    if (updateError) {
      if (isTemporalCollision(updateError)) throw new Error('prevent_double_booking');
      throw updateError;
    }

    revalidatePath('/dashboard/calendar');
    return { success: true };
    
  } catch (error: any) {
    console.error("[CRITICAL] Booking Update Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function createBookingAction(data: BookingPayload) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel || currentHotel.id !== data.hotel_id) {
      throw new Error('Violación de Seguridad: Acceso denegado.');
    }

    const staffId = await getActiveStaffId();
    let guestId = null;

    if (data.type === 'booking') {
      if (!data.guestDoc) throw new Error('Documento mandatorio para reservas.');
      
      const { data: existingGuest } = await supabaseAdmin
        .from('guests')
        .select('id')
        .eq('hotel_id', currentHotel.id)
        .eq('doc_number', data.guestDoc)
        .single();

      if (existingGuest) {
        guestId = existingGuest.id;
      } else {
        const { data: newGuest, error: guestError } = await supabaseAdmin
          .from('guests')
          .insert([{
              full_name: data.guestName,
              doc_number: data.guestDoc,
              phone: data.guestPhone,
              email: data.guestEmail,
              hotel_id: currentHotel.id,
            }])
          .select().single();

        if (guestError) throw new Error('Fallo al indexar identidad: ' + guestError.message);
        guestId = newGuest.id;
      }
    }

    const { error: bookingError } = await supabaseAdmin.from('bookings').insert([{
        hotel_id: currentHotel.id,
        room_id: data.roomId,
        guest_id: guestId,
        check_in: data.checkIn,
        check_out: data.checkOut,
        status: data.type === 'booking' ? 'confirmed' : 'maintenance',
        total_price: data.price,
        staff_id: staffId, 
        source: data.source || 'admin', 
      }]);

    if (bookingError) {
      if (isTemporalCollision(bookingError)) throw new Error('prevent_double_booking');
      throw new Error(bookingError.message);
    }

    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBookingDatesAction(bookingId: string, newRoomId: string, newCheckIn: string, newCheckOut: string) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ room_id: newRoomId, check_in: newCheckIn, check_out: newCheckOut })
      .eq('id', bookingId)
      .eq('hotel_id', currentHotel.id);

    if (updateError) {
      if (isTemporalCollision(updateError)) throw new Error('prevent_double_booking'); 
      throw new Error(updateError.message);
    }

    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelBookingAction(bookingId: string) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado.');

    const { error: cancelError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('hotel_id', currentHotel.id);

    if (cancelError) throw new Error('Error al purgar nodo: ' + cancelError.message);

    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function duplicateBookingAction(bookingId: string, newRoomId: string, newCheckIn: string, newCheckOut: string) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    const staffId = await getActiveStaffId();

    const { data: original, error: fetchErr } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('hotel_id', currentHotel.id)
      .single();

    if (fetchErr || !original) throw new Error('Origen inaccesible.');

    const { error: insErr } = await supabaseAdmin.from('bookings').insert({
        hotel_id: currentHotel.id,
        room_id: newRoomId,
        guest_id: original.guest_id, 
        check_in: newCheckIn,
        check_out: newCheckOut,
        status: original.status,     
        total_price: original.total_price, 
        staff_id: staffId, 
        source: 'admin',   
      });

    if (insErr) {
      if (isTemporalCollision(insErr)) throw new Error('prevent_double_booking');
      throw new Error(insErr.message);
    }

    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createPendingBookingAction(payload: PendingBookingPayload) {
  try {
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, hotel_id, price')
      .eq('id', payload.roomId)
      .single();

    if (roomError || !room) throw new Error('Unidad inactiva.');

    const checkIn = new Date(`${payload.checkin}T12:00:00Z`);
    const checkOut = new Date(`${payload.checkout}T12:00:00Z`);
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

    const verifiedTotal = room.price * nights;
    
    let guestId = null;
    const { data: existingGuest } = await supabaseAdmin
      .from('guests')
      .select('id')
      .eq('hotel_id', room.hotel_id)
      .eq('doc_number', payload.document)
      .single();

    if (existingGuest) {
      guestId = existingGuest.id;
    } else {
      const { data: newG, error: gErr } = await supabaseAdmin
        .from('guests')
        .insert([{
          hotel_id: room.hotel_id,
          full_name: payload.fullName,
          doc_number: payload.document,
          email: payload.email,
          phone: payload.phone
        }])
        .select('id').single();
        
      if (gErr) throw new Error('Fallo de indexación.');
      guestId = newG.id;
    }

    const { data: newB, error: bErr } = await supabaseAdmin
      .from('bookings')
      .insert([{
        hotel_id: room.hotel_id,
        room_id: room.id,
        guest_id: guestId, 
        check_in: payload.checkin,
        check_out: payload.checkout,
        total_price: verifiedTotal,
        status: 'PENDING',
        source: payload.source,
      }])
      .select('id').single();

    if (bErr) {
      if (isTemporalCollision(bErr)) throw new Error('prevent_double_booking');
      throw new Error(bErr.message);
    }

    const { data: link, error: lErr } = await supabaseAdmin
      .from('payment_links')
      .insert([{ reservation_id: newB.id, amount: verifiedTotal, status: 'PENDING' }])
      .select('id').single();

    if (lErr) throw new Error('Fallo al generar orden de liquidación.');

    revalidatePath('/dashboard/calendar');
    return { success: true, bookingId: link.id };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 🛡️ PROTOCOLO DE CHECK-IN ATÓMICO (RPC)
 * Delega la transacción completa a PostgreSQL: validaciones + updates en un solo viaje.
 * Elimina la ventana de race condition y el rollback manual.
 */
export async function processCheckInAction(bookingId: string) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('AUTH_ERROR: Nodo no autorizado.');

    // 1. EJECUCIÓN TRANSACCIONAL (RPC Atómico en PostgreSQL)
    const { data, error: rpcError } = await supabaseAdmin
      .rpc('atomic_check_in', { p_booking_id: bookingId });

    if (rpcError) {
      throw new Error(`RPC_ERROR: ${rpcError.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'CHECKIN_FAILED: Error desconocido en la transacción.');
    }

    // 2. PURGA DE CACHÉ GLOBAL
    revalidatePath('/dashboard', 'layout'); 
    
    return { success: true };

  } catch (error: any) {
    console.error('🚨 CHECKIN_FORENSIC_ERROR:', error.message);
    return { success: false, error: error.message };
  }
}