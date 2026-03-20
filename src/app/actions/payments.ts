'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Función auxiliar para leer quién es el cajero
async function getActiveStaff() {
  try {
    const cookieStore = await cookies();
    const staffCookie = cookieStore.get('hospeda_staff_session');
    if (staffCookie) {
      return JSON.parse(staffCookie.value); // Retorna { id, name, role }
    }
  } catch (error) {
    console.warn('Fallo al parsear la cookie del staff:', error);
  }
  return null;
}

// ------------------------------------------------------------------
// 1. REGISTRAR PAGO SEGURO (OPTIMIZADO CON PROMISE.ALL Y TIPADO SEGURO)
// ------------------------------------------------------------------
export async function processPaymentAction(payload: { 
  booking_id: string; 
  amount: number; 
  method: string; 
  notes?: string; // 🚨 QA: Hacemos notes opcional para evitar fallos de tipado estricto
}) {
  try {
    // 🚨 QA FIX: Eliminación de Cascada Asíncrona (Waterfall)
    // Lanzamos las peticiones independientes en paralelo para optimizar el tiempo de respuesta
    const [currentHotel, staff, bookingResponse] = await Promise.all([
      getCurrentHotel(),
      getActiveStaff(),
      supabaseAdmin.from('bookings').select('source').eq('id', payload.booking_id).single()
    ]);

    if (!currentHotel) throw new Error('No autorizado');

    // Procesamos la comisión basándonos en la respuesta paralela
    const booking = bookingResponse.data;
    const isOta = booking?.source === 'ota';
    const attributionTag = isOta ? '[Comisión: OTA 10%]' : '[Comisión: Directo 0%]';
    
    // 🚨 QA FIX: Defensa estricta contra "undefined" y espacios en blanco
    const safeNotes = payload.notes?.trim() || "";
    
    // Inyectamos la firma forense sin peligro de escribir "undefined | [Comisión...]"
    const forensicNotes = safeNotes ? `${safeNotes} | ${attributionTag}` : attributionTag;

    const { error } = await supabaseAdmin.from('payments').insert([
      {
        booking_id: payload.booking_id,
        amount: payload.amount,
        method: payload.method,
        notes: forensicNotes, // 🚨 Queda la evidencia financiera limpia
        staff_id: staff?.id || null, // 🚨 FIRMA DEL RECEPCIONISTA
      },
    ]);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/checkout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------------------------------------
// 2. GENERAR ARQUEO DE CAJA (REPORTE DE TURNO)
// ------------------------------------------------------------------
export async function getShiftReportAction() {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    const staff = await getActiveStaff();
    
    // Calculamos las últimas 12 horas (El tamaño estándar de un turno)
    const shiftStart = new Date();
    shiftStart.setHours(shiftStart.getHours() - 12);
    
    // Sintaxis correcta de Inner Join en Supabase para obtener el hotel de la reserva
    let query = supabaseAdmin
      .from('payments')
      .select('amount, method, created_at, staff_id, staff(name), bookings!inner(hotel_id)')
      .eq('bookings.hotel_id', currentHotel.id)
      .gte('created_at', shiftStart.toISOString());

    // Si es un recepcionista, solo ve SU dinero. Si es admin, ve TODO.
    if (staff && staff.role !== 'Administrador') {
      query = query.eq('staff_id', staff.id);
    }

    const { data: payments, error } = await query;
    if (error) throw new Error('Error consultando pagos: ' + error.message);

    // Sumarizar por método de pago
    const summary = {
      cash: 0,
      transfer: 0,
      wompi: 0,
      total: 0,
      staffName: staff?.name || 'Administrador General'
    };

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