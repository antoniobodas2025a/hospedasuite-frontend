'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';
import { cookies } from 'next/headers';
import { isTemporalCollision, type PostgresError } from '@/lib/booking-helpers';
import { emitEvent } from '@/lib/events';

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

interface UpdateBookingPayload {
  guestName?: string;
  guestDoc?: string;
  guestPhone?: string;
  guestEmail?: string;
  price?: number;
  checkIn?: string;
  checkOut?: string;
  roomId?: string;
}

// ==========================================
// BLOQUE 2: UTILIDADES DE AUDITORÍA
// ==========================================

/**
 * Extrae el mensaje de error de cualquier tipo de error lanzado en un catch.
 * Narrowing seguro: soporta PostgresError, Error estándar, y strings.
 */
function getErrorMessage(error: unknown): string {
  if (!error) return 'Error desconocido';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const pg = error as PostgresError;
    if (pg.message) return pg.message;
  }
  return 'Error desconocido';
}

async function getActiveStaffId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const staffCookie = cookieStore.get('hospeda_staff_session');
    if (staffCookie) {
      const staffData = JSON.parse(staffCookie.value);
      return staffData.id || null;
    }
  } catch (_error: unknown) {
    console.warn('Fallo al parsear la sesión del staff:', _error);
  }
  return null;
}

// ==========================================
// BLOQUE 3: ACCIONES CORE (ADMIN)
// ==========================================

export async function updateBookingDetailsAction(bookingId: string, data: UpdateBookingPayload) {
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
    
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("[CRITICAL] Booking Update Error:", message);
    return { success: false, error: message };
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

    const { data: newBooking, error: bookingError } = await supabaseAdmin.from('bookings').insert([{
        hotel_id: currentHotel.id,
        room_id: data.roomId,
        guest_id: guestId,
        check_in: data.checkIn,
        check_out: data.checkOut,
        status: data.type === 'booking' ? 'confirmed' : 'maintenance',
        total_price: data.price,
        staff_id: staffId,
        source: data.source || 'admin',
      }]).select('id').single();

    if (bookingError) {
      if (isTemporalCollision(bookingError)) throw new Error('prevent_double_booking');
      throw new Error(bookingError.message);
    }

    await emitEvent('booking.created', {
      bookingId: newBooking.id,
      hotelId: currentHotel.id,
      guestId: guestId,
      roomId: data.roomId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      totalAmount: data.price,
      status: 'confirmed',
    }, {
      hotelId: currentHotel.id,
      source: 'server-action',
    });

    await emitEvent('cache.invalidate', {
      paths: ['/dashboard/calendar'],
      tags: [`bookings-${currentHotel.id}`],
    }, {
      hotelId: currentHotel.id,
      source: 'server-action',
    });

    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
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
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
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

    await emitEvent('booking.cancelled', {
      bookingId: bookingId,
      hotelId: currentHotel.id,
    }, {
      hotelId: currentHotel.id,
      source: 'server-action',
    });

    await emitEvent('cache.invalidate', {
      paths: ['/dashboard/calendar'],
      tags: [`bookings-${currentHotel.id}`],
    }, {
      hotelId: currentHotel.id,
      source: 'server-action',
    });

    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
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
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
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

    // Price coherence: use payload.amount (includes IVA 19%) instead of
    // recalculating room.price * nights (which excludes IVA).
    // This ensures the DB total matches what the user actually pays via Wompi.
    // Verification: payload.amount should be within 25% of base rate to catch manipulation.
    const baseRate = room.price * nights;
    const maxExpected = Math.round(baseRate * 1.25); // base + 19% IVA + small buffer
    const minExpected = Math.round(baseRate * 0.95); // small discount tolerance

    if (payload.amount > maxExpected || payload.amount < minExpected) {
      throw new Error('Monto verificado no coincide con tarifa de la unidad.');
    }

    const verifiedTotal = payload.amount;
    
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

    // 🏷️ Atribución de canal: leer cookie hs_ref del middleware
    const cookieStore = await cookies();
    const refCookie = cookieStore.get('hs_ref');
    let referralChannel: string | undefined;
    let effectiveSource = payload.source;

    if (refCookie) {
      try {
        const refData = JSON.parse(refCookie.value);
        referralChannel = refData.channel;
        // Si viene de link social, es directo (0% comisión)
        if (referralChannel) {
          effectiveSource = 'direct';
        }
      } catch {
        // Cookie inválida, ignorar
      }
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
        source: effectiveSource,
        referral_channel: referralChannel || null,
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

  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
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

  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('🚨 CHECKIN_FORENSIC_ERROR:', message);
    return { success: false, error: message };
  }
}