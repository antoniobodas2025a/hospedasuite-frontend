'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
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

// ------------------------------------------------------------------
// 1. OBTENER ESTADO DE CUENTA (MIGRADOR A SERVER ACTION POR SEGURIDAD)
// ------------------------------------------------------------------
export async function getAccountStatementAction(bookingId: string, roomId: string, roomTotalPrice: number) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    const [servicesResponse, paymentsResponse] = await Promise.all([
      supabaseAdmin.from('service_orders').select('*').eq('room_id', roomId).eq('status', 'pending'),
      supabaseAdmin.from('payments').select('*').eq('booking_id', bookingId)
    ]);

    const services = servicesResponse.data || [];
    const payments = paymentsResponse.data || [];

    const serviceTotal = services.reduce((acc, curr) => acc + curr.total_price, 0);
    const paymentTotal = payments.reduce((acc, curr) => acc + curr.amount, 0);
    const totalDebt = roomTotalPrice + serviceTotal;
    const balanceDue = totalDebt - paymentTotal;

    return {
      success: true,
      statement: {
        roomArgs: roomTotalPrice,
        serviceCharges: serviceTotal,
        totalPaid: paymentTotal,
        balance: balanceDue,
        details: { services, payments }
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------------------------------------
// 2. REGISTRAR PAGO SEGURO
// ------------------------------------------------------------------
export async function processPaymentAction(payload: { 
  booking_id: string; 
  amount: number; 
  method: string; 
  notes?: string; 
}) {
  try {
    const [currentHotel, staff, bookingResponse] = await Promise.all([
      getCurrentHotel(),
      getActiveStaff(),
      supabaseAdmin.from('bookings').select('source').eq('id', payload.booking_id).single()
    ]);

    if (!currentHotel) throw new Error('No autorizado');

    const booking = bookingResponse.data;
    const isOta = booking?.source === 'ota';
    const attributionTag = isOta ? '[Comisión: OTA 10%]' : '[Comisión: Directo 0%]';
    
    const safeNotes = payload.notes?.trim() || "";
    const forensicNotes = safeNotes ? `${safeNotes} | ${attributionTag}` : attributionTag;

    const { error } = await supabaseAdmin.from('payments').insert([{
      booking_id: payload.booking_id,
      amount: payload.amount,
      method: payload.method,
      notes: forensicNotes,
      staff_id: staff?.id || null,
    }]);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/checkout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------------------------------------
// 3. CERRAR CUENTA (CHECKOUT DEFINITIVO - ZERO TRUST)
// ------------------------------------------------------------------
export async function finalizeCheckoutAction(bookingId: string, roomId: string, serviceIds: string[]) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    // Transacción pseudo-atómica en Supabase (Ejecución paralela de actualizaciones)
    const updates = [
      supabaseAdmin.from('bookings').update({ status: 'checked_out' }).eq('id', bookingId).eq('hotel_id', currentHotel.id),
      supabaseAdmin.from('rooms').update({ status: 'dirty' }).eq('id', roomId).eq('hotel_id', currentHotel.id)
    ];

    if (serviceIds.length > 0) {
      updates.push(supabaseAdmin.from('service_orders').update({ status: 'completed' }).in('id', serviceIds).eq('hotel_id', currentHotel.id));
    }

    const results = await Promise.all(updates);
    const hasErrors = results.some(res => res.error);

    if (hasErrors) throw new Error('Fallo crítico al liberar el inventario. Contacte a soporte.');

    revalidatePath('/dashboard/checkout');
    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------------------------------------
// 4. SUSCRIPCIÓN A ADD-ONS (NUEVO MODELO DE NEGOCIO: Channel Manager)
// ------------------------------------------------------------------
export async function toggleChannelManagerAddonAction(enable: boolean) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    // Suponiendo que existe la columna has_channel_manager en la tabla hotels
    const { error } = await supabaseAdmin
      .from('hotels')
      .update({ has_channel_manager: enable })
      .eq('id', currentHotel.id);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/settings');
    return { success: true, message: enable ? 'Seguro Anti-Sobreventa Activado ($30,000/mes)' : 'Seguro Desactivado' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------------------------------------
// 5. GENERAR ARQUEO DE CAJA
// ------------------------------------------------------------------
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