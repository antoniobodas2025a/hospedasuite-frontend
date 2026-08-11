'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';
import { cookies } from 'next/headers';
import { isTemporalCollision, type PostgresError } from '@/lib/booking-helpers';
import { emitEvent } from '@/lib/events';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getEffectiveTaxRate } from '@/lib/pricing';
import { verifySession } from '@/lib/session-utils';
import { requireHotelAccess } from '@/lib/tenant-guard';

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
  consentAccepted?: boolean; // Ley 1581 de 2012 — optional for 48h deploy window
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
      const session = verifySession(staffCookie.value);
      return session?.id || null;
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
      .select('guest_id, status, total_price')
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

    // B2C Colombian model: payload.amount is the final price the guest pays
    // (room.price * nights, IVA already included in the entered price).
    // This ensures the DB total matches what the user actually pays via Wompi.
    const baseRate = room.price * nights;

    // Fetch hotel tax_rate for reference
    const { data: hotelData } = await supabaseAdmin
      .from('hotels')
      .select('tax_rate, tax_regime')
      .eq('id', room.hotel_id)
      .single();

    const maxExpected = Math.round(baseRate * 1.05); // 5% buffer above entered price
    const minExpected = Math.round(baseRate * 0.95); // 5% discount tolerance

    if (payload.amount > maxExpected || payload.amount < minExpected) {
      throw new Error('Monto verificado no coincide con tarifa de la unidad.');
    }

    // 🛡️ Ley 1581 de 2012: consent validation
    // Optional during 48h deploy window (missing = accepted with warning)
    // After 48h: change to required (reject if missing or false)
    if (payload.consentAccepted === false) {
      throw new Error('Consentimiento requerido. Debe aceptar la política de tratamiento de datos.');
    }
    if (payload.consentAccepted === undefined) {
      console.warn('[CONSENT] Booking created without explicit consent (deploy window). Guest:', payload.email);
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
        consent_accepted: payload.consentAccepted === true,
        consent_timestamp: payload.consentAccepted ? new Date().toISOString() : null,
      }])
      .select('id').single();

    if (bErr) {
      if (isTemporalCollision(bErr)) throw new Error('prevent_double_booking');
      throw new Error(bErr.message);
    }

    // 🛡️ Consent audit trail (Ley 1581 de 2012) — non-blocking
    if (payload.consentAccepted && guestId) {
      try {
        await supabaseAdmin.from('consent_audit').insert({
          guest_id: guestId,
          hotel_id: room.hotel_id,
          booking_id: newB.id,
          terms_version: 'guest-v1.0',
          action: 'accept',
          context: 'guest_checkout',
          consent_timestamp: new Date().toISOString(),
        });
      } catch (auditErr) {
        console.error('[CONSENT] Failed to write consent audit:', auditErr);
      }
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

/**
 * Verifica el estado real de una reserva para la página de éxito.
 * Previene que usuarios vean "éxito" falso con IDs inventados.
 */
export async function verifyBookingAction(bookingId: string) {
  try {
    if (!bookingId) return { success: false, error: 'No se proporcionó ID de reserva' };

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('id, status, total_price, check_in, check_out, source, room_id, hotel_id, guests(full_name, email), rooms(name, price), hotels(name, slug, tax_rate, tax_regime, address, phone), payments(method, status)')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { success: false, error: 'Reserva no encontrada', status: 'not_found' };
    }

    // 🛡️ TENANT GUARD: Verify hotel ownership via staff session
    const { allowed, error: guardError } = await requireHotelAccess(booking.hotel_id, (await cookies()).get('hospeda_staff_session')?.value);
    if (!allowed) {
      return { success: false, error: guardError };
    }

    // Compute nights from check_in/check_out
    const checkInDate = new Date(booking.check_in);
    const checkOutDate = new Date(booking.check_out);
    const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24)));
    const roomPrice = (booking.rooms as any[])?.[0]?.price ?? 0;
    const hotelRecord = (booking.hotels as any[])?.[0] ?? {};
    const taxRate = typeof hotelRecord.tax_rate === 'number' ? hotelRecord.tax_rate : (hotelRecord.tax_regime === 'responsible' ? 0.19 : 0);

    const paymentMethod = ((booking.payments as any[])?.[0]?.method as string | undefined) || 'direct';

    return {
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        totalPrice: booking.total_price,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        nights,
        pricePerNight: roomPrice,
        taxRate,
        roomId: booking.room_id,
        hotelId: booking.hotel_id,
        paymentMethod,
        guestName: (booking.guests as any[])?.[0]?.full_name,
        guestEmail: (booking.guests as any[])?.[0]?.email,
        roomName: (booking.rooms as any[])?.[0]?.name,
        hotelName: (booking.hotels as any[])?.[0]?.name,
        hotelSlug: (booking.hotels as any[])?.[0]?.slug,
        hotelAddress: (booking.hotels as any[])?.[0]?.address || null,
        hotelPhone: (booking.hotels as any[])?.[0]?.phone || null,
      },
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Simula una reserva de prueba para que el hotelero vea el flujo completo.
 * Crea una reserva CONFIRMED con un pago TEST de $1.000 COP.
 */
export async function simulateBookingAction() {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) {
      return { success: false, error: 'Hotel no encontrado' };
    }

    // Get first active room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, name, price')
      .eq('hotel_id', currentHotel.id)
      .eq('status', 'active')
      .single();

    if (roomError || !room) {
      return { success: false, error: 'No hay habitaciones activas para simular' };
    }

    // Create test guest
    const { data: guest, error: guestError } = await supabaseAdmin
      .from('guests')
      .insert([{
        full_name: 'Huésped de Prueba',
        doc_number: 'TEST-000',
        phone: '+570000000000',
        email: 'test@hospedasuite.com',
        hotel_id: currentHotel.id,
      }])
      .select('id')
      .single();

    if (guestError) {
      return { success: false, error: 'Error creando huésped de prueba' };
    }

    // Create test booking for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkIn = tomorrow.toISOString().split('T')[0];
    const checkOut = new Date(tomorrow.getTime() + 86400000).toISOString().split('T')[0];

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert([{
        hotel_id: currentHotel.id,
        room_id: room.id,
        guest_id: guest.id,
        check_in: checkIn,
        check_out: checkOut,
        status: 'CONFIRMED',
        total_price: 1000, // $1.000 COP test amount
        source: 'direct',
        staff_id: null,
      }])
      .select('id')
      .single();

    if (bookingError) {
      return { success: false, error: bookingError.message };
    }

    // Create test payment record
    await supabaseAdmin.from('payments').insert({
      booking_id: booking.id,
      amount: 1000,
      method: 'test',
      notes: 'RESERVA DE PRUEBA - No es un pago real',
      staff_id: null,
    });

    return { success: true, bookingId: booking.id, roomName: room.name };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/** Form-compatible wrapper for simulateBookingAction */
export async function simulateBookingFormAction(): Promise<void> {
  await simulateBookingAction();
}