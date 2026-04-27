'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';
import { cookies } from 'next/headers';

// ------------------------------------------------------------------
// 🛡️ HERRAMIENTAS FORENSES Y DE ADMINISTRADOR
// ------------------------------------------------------------------

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getActiveStaff() {
  try {
    const cookieStore = await cookies();
    const staffCookie = cookieStore.get('hospeda_staff_session');
    if (staffCookie) {
      return JSON.parse(staffCookie.value);
    }
  } catch (error) {
    console.warn('Fallo al parsear la cookie del staff:', error);
  }
  return null;
}

// ============================================================================
// 1. OBTENCIÓN DEL ESTADO DE CUENTA
// ============================================================================
export async function getAccountStatementAction(
  bookingId: string, 
  roomId: string, 
  clientCalculatedPrice?: number
) {
  try {
    const supabase = await createClient();

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(`
        id, total_price, check_in, check_out, room_id, status,
        payments (id, amount, method, created_at)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) throw new Error('Reserva no encontrada');

    const { data: services } = await supabase
      .from('service_items')
      .select('id, description, quantity, total_price, created_at, status')
      .or(`booking_id.eq.${bookingId},room_id.eq.${roomId}`)
      .eq('status', 'pending');

    const validServices = services || [];

    const { data: room } = await supabase
      .from('rooms')
      .select('price, weekend_price')
      .eq('id', roomId || booking.room_id)
      .single();

    let finalRoomCharge = 0;

    if (booking.total_price && booking.total_price > 0) {
      finalRoomCharge = booking.total_price;
    } else if (clientCalculatedPrice && clientCalculatedPrice > 0) {
      finalRoomCharge = clientCalculatedPrice;
    } else if (room) {
      const { calculateStayPrice } = await import('@/utils/supabase/pricing');
      const breakdown = calculateStayPrice(
        booking.check_in, 
        booking.check_out, 
        room.price || 0, 
        room.weekend_price || (room.price * 1.2)
      );
      finalRoomCharge = breakdown.totalPrice;
    }

    const serviceCharges = validServices.reduce((sum, s) => sum + (s.total_price || 0), 0);
    const totalPaid = booking.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const balance = (finalRoomCharge + serviceCharges) - totalPaid;

    return {
      success: true,
      statement: {
        roomArgs: finalRoomCharge,
        serviceCharges,
        totalPaid,
        balance,
        details: {
          services: validServices,
          payments: booking.payments || []
        }
      }
    };
  } catch (error: any) {
    console.error('Account Statement Error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 2. REGISTRAR PAGO SEGURO (Abierto para abonos parciales)
// ============================================================================
export async function processPaymentAction(payload: { 
  booking_id: string; 
  amount: number; 
  method: string; 
  notes?: string; 
}) {
  try {
    const [currentHotel, staff] = await Promise.all([
      getCurrentHotel(),
      getActiveStaff()
    ]);

    if (!currentHotel) throw new Error('No autorizado');

    const supabase = await createClient();

    const { data: booking } = await supabase
      .from('bookings')
      .select('source')
      .eq('id', payload.booking_id)
      .single();

    const isOta = booking?.source === 'ota';
    const attributionTag = isOta ? '[Comisión: OTA 10%]' : '[Comisión: Directo 0%]';
    
    const safeNotes = payload.notes?.trim() || "";
    const forensicNotes = safeNotes ? `${safeNotes} | ${attributionTag}` : attributionTag;

    const { error } = await supabase.from('payments').insert({
      booking_id: payload.booking_id,
      amount: payload.amount,
      method: payload.method,
      notes: forensicNotes,
      staff_id: staff?.id || null, 
    });

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/checkout');
    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 3. FINALIZAR CHECKOUT (CON TRIPLE PURGA DE CACHÉ)
// ============================================================================
export async function finalizeCheckoutAction(bookingId: string, roomId: string, serviceIds: string[]) {
  try {
    const supabase = await createClient();

    // 1. Cambio de Estado Atómico en el Ledger
    const { error: bookingErr } = await supabase
      .from('bookings')
      .update({ status: 'checked_out' })
      .eq('id', bookingId);
    
    if (bookingErr) throw new Error('DB_ERROR: No se pudo cerrar el folio de reserva.');

    // 2. Liberación de Inventario (Marcado como Sucio)
    const { error: roomErr } = await supabase
      .from('rooms')
      .update({ status: 'dirty' })
      .eq('id', roomId);
    
    if (roomErr) console.error('⚠️ Advertencia: No se pudo marcar habitación como sucia:', roomErr.message);

    // 3. Cierre de Consumos Extra
    if (serviceIds.length > 0) {
      const { error: svcErr } = await supabase
        .from('service_items')
        .update({ status: 'paid' })
        .in('id', serviceIds);
        
      if (svcErr) console.warn('⚠️ Advertencia: No se pudieron cerrar los consumos asociados.', svcErr.message);
    }

    // 🛡️ PROTOCOLO FORENSE: Purga de Datos Global (Garantiza limpieza de Sidebar)
    revalidatePath('/dashboard', 'layout'); 
    revalidatePath('/dashboard/checkout');
    revalidatePath('/dashboard/calendar');

    return { success: true };
  } catch (error: any) {
    console.error('Finalize Checkout Error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 4. SUSCRIPCIÓN A ADD-ONS
// ============================================================================
export async function toggleChannelManagerAddonAction(enable: boolean) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    const { error } = await supabaseAdmin
      .from('hotels')
      .update({ has_channel_manager: enable })
      .eq('id', currentHotel.id);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/settings');
    return { success: true, message: enable ? 'Seguro Anti-Sobreventa Activado' : 'Seguro Desactivado' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 5. GENERAR ARQUEO DE CAJA
// ============================================================================
export async function getShiftReportAction() {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    const staff = await getActiveStaff();
    const shiftStart = new Date();
    shiftStart.setHours(shiftStart.getHours() - 12);
    
    let query = supabaseAdmin
      .from('payments')
      .select('amount, method, created_at, staff_id, staff(name), bookings!inner(hotel_id)')
      .eq('bookings.hotel_id', currentHotel.id)
      .gte('created_at', shiftStart.toISOString());

    if (staff && staff.role !== 'Administrador') {
      query = query.eq('staff_id', staff.id);
    }

    const { data: payments, error } = await query;
    if (error) throw new Error('Error consultando pagos: ' + error.message);

    const summary = { cash: 0, transfer: 0, wompi: 0, total: 0, staffName: staff?.name || 'Administrador General' };

    payments?.forEach(p => {
      if (p.method === 'cash') summary.cash += p.amount;
      if (p.method === 'transfer') summary.transfer += p.amount;
      if (p.method === 'wompi') summary.wompi += p.amount;
      summary.total += p.amount;
    });

    return { success: true, summary, shiftStart: shiftStart.toISOString() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}