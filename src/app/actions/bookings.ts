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

// 💰 REGLAS DE NEGOCIO HOSPEDASUITE (CAMINO B)
const PLATFORM_OTA_FEE_PERCENTAGE = 0.10; // 10% de comisión OTA
const PLATFORM_DIRECT_FEE_PERCENTAGE = 0.00; // 0% de comisión canal directo
const PLATFORM_UPSELL_FEE_PERCENTAGE = 0.03; // 🚀 NUEVO: 3% por ventas generadas por IA

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
// ACCIÓN 1: Crear Reserva (Desde el Admin Dashboard / Recepción)
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
        platform_fee: 0, // Reservas de admin no pagan fee
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
// ACCIÓN 2: Mover Reserva (Drag & Drop en Calendario)
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
// ACCIÓN 3: Cancelar Reserva
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
// ACCIÓN 4: Clonar Reserva (Copiar y Pegar)
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
        platform_fee: originalBooking.platform_fee,
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
    // 1. 🛑 BARRERA ZERO-TRUST: Jamás confíes en el precio que envía el Frontend
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, hotel_id, price')
      .eq('id', payload.roomId)
      .single();

    if (roomError || !room) {
      throw new Error('Habitación no encontrada o inactiva.');
    }

    // 2. Cálculo de Noches (Matemática Inmutable)
    const checkInDate = new Date(`${payload.checkin}T12:00:00Z`);
    const checkOutDate = new Date(`${payload.checkout}T12:00:00Z`);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const totalNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 3. AISLAMIENTO FINANCIERO: Hospedaje vs Upsells
    const verifiedAccommodationTotal = room.price * totalNights;
    
    let verifiedUpsellsTotal = 0;
    if (payload.upsells && payload.upsells.length > 0) {
      payload.upsells.forEach(item => {
        if (UPSELL_PRICES[item]) verifiedUpsellsTotal += UPSELL_PRICES[item];
      });
    }

    const finalVerifiedTotal = verifiedAccommodationTotal + verifiedUpsellsTotal;

    // 4. 💸 MOTOR DE LIQUIDACIÓN DE LA OTA (Su modelo de negocio expandido)
    let calculatedPlatformFee = 0;
    
    if (payload.source === 'ota') {
      calculatedPlatformFee = verifiedAccommodationTotal * PLATFORM_OTA_FEE_PERCENTAGE;
    } else if (payload.source === 'direct') {
      calculatedPlatformFee = verifiedAccommodationTotal * PLATFORM_DIRECT_FEE_PERCENTAGE;
    }

    // 🚀 Lógica de Comisión por Upselling (Aplica sin importar el origen de la reserva)
    const upsellingFee = verifiedUpsellsTotal * PLATFORM_UPSELL_FEE_PERCENTAGE;
    calculatedPlatformFee += upsellingFee; // Se suma al libro mayor

    // 5. Gestión del Huésped
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
      const { data: newGuest, error: guestError } = await supabaseAdmin
        .from('guests')
        .insert([{
          hotel_id: room.hotel_id,
          full_name: payload.fullName,
          doc_number: payload.document,
          email: payload.email,
          phone: payload.phone
        }])
        .select('id')
        .single();
        
      if (guestError || !newGuest) throw new Error('Fallo al registrar el huésped.');
      guestId = newGuest.id;
    }

    // 6. INSERCIÓN DE LA RESERVA CON TRAZABILIDAD FINANCIERA
    const { data: newBooking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert([{
        hotel_id: room.hotel_id,
        room_id: room.id,
        guest_id: guestId, 
        check_in: payload.checkin,
        check_out: payload.checkout,
        total_price: finalVerifiedTotal,
        platform_fee: calculatedPlatformFee, // 💰 SU DINERO QUEDA REGISTRADO AQUÍ
        status: 'PENDING',
        source: payload.source,
      }])
      .select('id')
      .single();

    if (bookingError || !newBooking) {
      console.error("[CRITICAL] Error al insertar reserva:", bookingError);
      return { success: false, error: 'No se pudo registrar la reserva en el sistema central.' };
    }

    // 7. ORDEN DE COBRO (Para Wompi)
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
    return { success: false, error: error.message };
  }
}