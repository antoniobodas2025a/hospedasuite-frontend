'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';
import { cookies } from 'next/headers';

// 🛡️ CLIENTE PRIVILEGIADO GLOBAL (Solo para Server Actions seguros)
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BookingPayload {
  hotel_id: string;
  type: 'booking' | 'maintenance';
  guestName: string;
  guestDoc: string;
  guestPhone: string;
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

const UPSELL_PRICES: Record<string, number> = {
  wine: 75000,
  breakfast: 45000,
  romantic: 120000,
};

async function getActiveStaffId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const staffCookie = cookieStore.get('hospeda_staff_session');
    if (staffCookie) {
      const staffData = JSON.parse(staffCookie.value);
      return staffData.id || null;
    }
  } catch (error) {
    console.warn('Fallo al parsear la cookie del staff:', error);
  }
  return null;
}

// ------------------------------------------------------------------
// ACCIÓN 1: Crear Reserva (Admin Dashboard) - RESTAURADA
// ------------------------------------------------------------------
export async function createBookingAction(data: BookingPayload) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel || currentHotel.id !== data.hotel_id) {
      throw new Error('Violación de Seguridad: No tienes permisos para este hotel.');
    }

    const staffId = await getActiveStaffId();
    let guestId = null;

    const cookieStore = await cookies();
    const sourceCookie = cookieStore.get('hospeda_source')?.value;

    let bookingSource = data.source;
    if (!bookingSource) {
      if (staffId) bookingSource = 'admin';
      else if (sourceCookie === 'ota') bookingSource = 'ota';
      else bookingSource = 'direct';
    }

    if (data.type === 'booking') {
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
          .select()
          .single();

        if (guestError) throw new Error('Error creando perfil del huésped: ' + guestError.message);
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
        source: bookingSource, 
      }]);

    if (bookingError) throw new Error('Error registrando la reserva: ' + bookingError.message);

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------------------------------------
// ACCIÓN 2: Mover Reserva (Drag & Drop) - RESTAURADA
// ------------------------------------------------------------------
export async function updateBookingDatesAction(bookingId: string, newRoomId: string, newCheckIn: string, newCheckOut: string) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    const { data: overlappingBookings, error: overlapError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('hotel_id', currentHotel.id)
      .eq('room_id', newRoomId)
      .in('status', ['confirmed', 'checked_in'])
      .neq('id', bookingId)
      .lt('check_in', newCheckOut) 
      .gt('check_out', newCheckIn); 

    if (overlapError) throw new Error('Error al validar disponibilidad en BD.');

    if (overlappingBookings && overlappingBookings.length > 0) {
      return { success: false, error: 'Las fechas chocan con otra reserva.' };
    }

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ room_id: newRoomId, check_in: newCheckIn, check_out: newCheckOut })
      .eq('id', bookingId)
      .eq('hotel_id', currentHotel.id);

    if (updateError) throw new Error('Error en BD: ' + updateError.message);

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------------------------------------
// ACCIÓN 3: Cancelar Reserva - RESTAURADA
// ------------------------------------------------------------------
export async function cancelBookingAction(bookingId: string) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('Violación de Seguridad: No autorizado.');

    const { error: cancelError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('hotel_id', currentHotel.id);

    if (cancelError) throw new Error('Error al cancelar: ' + cancelError.message);

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------------------------------------
// ACCIÓN 4: Clonar Reserva (Copiar y Pegar) - RESTAURADA
// ------------------------------------------------------------------
export async function duplicateBookingAction(bookingId: string, newRoomId: string, newCheckIn: string, newCheckOut: string) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    const staffId = await getActiveStaffId();

    const { data: overlappingBookings, error: overlapError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('hotel_id', currentHotel.id)
      .eq('room_id', newRoomId)
      .in('status', ['confirmed', 'checked_in'])
      .lt('check_in', newCheckOut)
      .gt('check_out', newCheckIn);

    if (overlapError) throw new Error('Error al validar disponibilidad en BD.');

    if (overlappingBookings && overlappingBookings.length > 0) {
      return { success: false, error: 'Las fechas chocan con otra reserva.' };
    }

    const { data: originalBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('hotel_id', currentHotel.id)
      .single();

    if (fetchError || !originalBooking) throw new Error('No se pudo leer la reserva original.');

    const { error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert({
        hotel_id: currentHotel.id,
        room_id: newRoomId,
        guest_id: originalBooking.guest_id, 
        check_in: newCheckIn,
        check_out: newCheckOut,
        status: originalBooking.status,     
        total_price: originalBooking.total_price, 
        staff_id: staffId, 
        source: 'admin',   
      });

    if (insertError) throw new Error('Error al crear el clon: ' + insertError.message);

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------------------------------------
// 🚨 ACCIÓN 5: Crear Reserva PENDIENTE B2C (Zero-Trust + Wompi)
// ------------------------------------------------------------------
export async function createPendingBookingAction(payload: PendingBookingPayload) {
  try {
    if (!payload.roomId || !payload.checkin || !payload.checkout || !payload.fullName || !payload.document) {
      return { success: false, error: 'Faltan datos obligatorios para procesar la reserva.' };
    }

    const checkInDate = new Date(`${payload.checkin}T12:00:00Z`);
    const checkOutDate = new Date(`${payload.checkout}T12:00:00Z`);
    
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime()) || checkInDate >= checkOutDate) {
      return { success: false, error: 'Inconsistencia temporal en las fechas seleccionadas.' };
    }

    const { data: overlappingBookings, error: overlapError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('room_id', payload.roomId)
      .neq('status', 'cancelled')
      .lt('check_in', payload.checkout)
      .gt('check_out', payload.checkin)
      .limit(1);

    if (overlapError) throw new Error('Fallo al verificar disponibilidad del inventario en tiempo real.');
    if (overlappingBookings && overlappingBookings.length > 0) {
      return { success: false, error: 'La habitación acaba de ser reservada por otro usuario. Por favor, selecciona otras fechas.' };
    }

    // 🛡️ CORRECCIÓN DE ESQUEMA APLICADA
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('hotel_id, price, base_price')
      .eq('id', payload.roomId)
      .single();

    if (roomError) {
      console.error("[CRITICAL DB ERROR] Fallo al consultar habitación:", roomError);
    }

    if (!room) {
      return { success: false, error: 'No se pudo verificar el inventario de la habitación.' };
    }

    const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // 🛡️ CORRECCIÓN MATEMÁTICA APLICADA
    const pricePerNight = Number(room.price || room.base_price || 0);
    
    if (pricePerNight <= 0) {
      return { success: false, error: 'Inconsistencia financiera en el costo de la habitación.' };
    }

    const verifiedBasePrice = pricePerNight * nights;

    let verifiedUpsellsTotal = 0;
    if (Array.isArray(payload.upsells)) {
      payload.upsells.forEach(u => {
        if (UPSELL_PRICES[u]) verifiedUpsellsTotal += UPSELL_PRICES[u];
      });
    }

    const finalVerifiedTotal = verifiedBasePrice + verifiedUpsellsTotal;

    if (finalVerifiedTotal !== payload.amount) {
      console.warn(`[AUDIT WARN] Manipulación detectada. Cliente envió: ${payload.amount}, Backend calculó: ${finalVerifiedTotal}. Aplicando valor seguro.`);
    }

    let guestId;
    const { data: existingGuest } = await supabaseAdmin
      .from('guests')
      .select('id')
      .eq('email', payload.email)
      .maybeSingle();

    if (existingGuest) {
      guestId = existingGuest.id;
    } else {
      const { data: newGuest, error: guestError } = await supabaseAdmin
        .from('guests')
        .insert([{
          full_name: payload.fullName,
          email: payload.email,
          doc_number: payload.document,
          phone: payload.phone,
          hotel_id: room.hotel_id 
        }])
        .select('id')
        .single();

      if (guestError) throw new Error('Error al registrar el perfil del huésped: ' + guestError.message);
      guestId = newGuest.id;
    }

    const { data: newBooking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert([{
        hotel_id: room.hotel_id,
        room_id: payload.roomId,
        guest_id: guestId, 
        check_in: payload.checkin,
        check_out: payload.checkout,
        total_price: finalVerifiedTotal,
        status: 'PENDING',
        source: payload.source,
      }])
      .select('id')
      .single();

    if (bookingError || !newBooking) {
      console.error("[CRITICAL] Error al insertar reserva:", bookingError);
      return { success: false, error: 'No se pudo registrar la reserva en el sistema central.' };
    }

    const { data: paymentLink, error: paymentError } = await supabaseAdmin
      .from('payment_links')
      .insert([{
        reservation_id: newBooking.id,
        amount: finalVerifiedTotal,
        status: 'PENDING',
      }])
      .select('id')
      .single();

    if (paymentError || !paymentLink) {
      console.error("[CRITICAL] Error al crear link de pago:", paymentError);
      return { success: false, error: 'No se pudo generar la orden de cobro.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/calendar');

    return { success: true, bookingId: paymentLink.id };

  } catch (error: any) {
    console.error("[CRITICAL] Fatal Server Action Error:", error.message);
    return { success: false, error: 'Fallo crítico del servidor. Por favor contacta a soporte.' };
  }
}