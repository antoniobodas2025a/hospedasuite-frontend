'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context'; // 🔐 Importamos el candado de seguridad
import { cookies } from 'next/headers'; // 🚨 Necesario para la auditoría de caja

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- 🛡️ BARRERAS DE TIPADO ESTRICTO (Zero-Trust) ---
interface OrderPayload {
  hotel_id: string;
  room_id: string;
  booking_id?: string; // CRÍTICO: Para vincular al folio exacto
  items: any;
  total_price: number;
}

interface ProductPayload {
  hotel_id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  image_emoji: string;
}

// ============================================================================
// 📦 CÓDIGO ORIGINAL BLINDADO
// ============================================================================

export async function createOrderAction(payload: OrderPayload) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel || currentHotel.id !== payload.hotel_id) {
      throw new Error('Violación de Seguridad: No tienes permisos para este hotel.');
    }

    if (payload.total_price < 0) throw new Error('Operación rechazada: Monto negativo.');

    const { error } = await supabaseAdmin.from('service_orders').insert([
      {
        hotel_id: currentHotel.id,
        room_id: payload.room_id,
        booking_id: payload.booking_id || null, // Vínculo financiero
        items: payload.items,
        total_price: payload.total_price,
        status: 'pending',
        payment_method: 'room_charge',
      },
    ]);

    if (error) throw new Error(`[DB Error]: ${error.message}`);

    revalidatePath('/dashboard/services');
    revalidatePath('/dashboard/checkout');
    return { success: true };
  } catch (error: any) {
    console.error('🚨 [SEC-OPS] Fallo en createOrderAction:', error);
    return { success: false, error: error.message };
  }
}

export async function createProductAction(payload: ProductPayload) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel || currentHotel.id !== payload.hotel_id) {
      throw new Error('Violación de Seguridad: No tienes permisos para este hotel.');
    }

    if (!payload.name || payload.price < 0) {
      throw new Error('Datos de producto inválidos.');
    }

    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .insert([
        {
          name: payload.name.trim(),
          category: payload.category,
          price: payload.price,
          description: payload.description,
          image_emoji: payload.image_emoji || '📦',
          hotel_id: currentHotel.id,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`[DB Error]: ${error.message}`);

    revalidatePath('/dashboard/services');
    revalidatePath('/dashboard/pos');
    return { success: true, data };
  } catch (error: any) {
    console.error('🚨 [SEC-OPS] Fallo en createProductAction:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🚀 MOTOR POS AVANZADO
// ============================================================================

// 1. OBTENER HABITACIONES OCUPADAS (Para el buscador del POS)
export async function getActiveBookingsForPosAction() {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('id, room_id, rooms(name), guest_id, guests(full_name)')
      .eq('hotel_id', currentHotel.id)
      .eq('status', 'checked_in');

    if (error) throw new Error(`[DB Error]: ${error.message}`);

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. CARGAR CONSUMO A LA HABITACIÓN (Escribe en service_orders)
export async function chargeToRoomAction(bookingId: string, roomId: string, description: string, amount: number) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');
    
    if (amount < 0) throw new Error('Operación rechazada: Monto negativo.');

    const { error } = await supabaseAdmin.from('service_orders').insert([
      {
        hotel_id: currentHotel.id,
        room_id: roomId, 
        booking_id: bookingId, // 🛡️ CRÍTICO: Atamos el consumo al folio del huésped actual
        items: description, 
        total_price: amount,
        status: 'pending',
        payment_method: 'room_charge',
      }
    ]);

    if (error) throw new Error(`[DB Error]: ${error.message}`);

    revalidatePath('/dashboard/checkout');
    revalidatePath('/dashboard/pos');
    return { success: true };
  } catch (error: any) {
    console.error('🚨 [SEC-OPS] Fallo en chargeToRoomAction:', error);
    return { success: false, error: error.message };
  }
}

// 3. COBRO INMEDIATO (Cliente de Paso / Walk-in)
export async function processWalkInChargeAction(amount: number, description: string) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');
    
    if (amount < 0) throw new Error('Operación rechazada: Monto negativo.');

    const cookieStore = await cookies();
    const staffCookie = cookieStore.get('hospeda_staff_session');
    
    // 🛡️ BARRERA FORENSE: Evitar caída por JSON corrupto
    let staffId = null;
    try {
      if (staffCookie?.value) {
        staffId = JSON.parse(staffCookie.value).id;
      }
    } catch (parseError) {
      console.warn('⚠️ [SEC-OPS] Cookie de staff inválida o alterada. Procediendo como Anónimo.');
    }

    const { error } = await supabaseAdmin.from('payments').insert([
      {
        amount: amount,
        method: 'cash',
        notes: `Walk-in POS: ${description}`,
        staff_id: staffId,
      }
    ]);

    if (error) throw new Error(`[DB Error]: ${error.message}`);

    return { success: true };
  } catch (error: any) {
    console.error('🚨 [SEC-OPS] Fallo en processWalkInChargeAction:', error);
    return { success: false, error: error.message };
  }
}

// 4. OBTENER EL MENÚ REAL DE LA BASE DE DATOS
export async function getMenuAction() {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .eq('hotel_id', currentHotel.id)
      // Si tienes una columna is_available, descomenta la siguiente línea:
      // .eq('is_available', true) 
      .order('category', { ascending: true });

    if (error) throw new Error(`[DB Error]: ${error.message}`);

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}