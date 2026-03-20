'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context'; // 🔐 Importamos el candado de seguridad
import { cookies } from 'next/headers'; // 🚨 Necesario para la auditoría de caja

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// 📦 CÓDIGO ORIGINAL (Mantenido intacto para no romper dependencias)
// ============================================================================

export async function createOrderAction(payload: any) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel || currentHotel.id !== payload.hotel_id) {
      throw new Error('Violación de Seguridad: No tienes permisos para este hotel.');
    }

    const { error } = await supabaseAdmin.from('service_orders').insert([
      {
        hotel_id: currentHotel.id,
        room_id: payload.room_id,
        items: payload.items,
        total_price: payload.total_price,
        status: 'pending',
        payment_method: 'room_charge',
      },
    ]);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/services');
    revalidatePath('/dashboard/checkout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createProductAction(payload: any) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel || currentHotel.id !== payload.hotel_id) {
      throw new Error('Violación de Seguridad: No tienes permisos para este hotel.');
    }

    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .insert([
        {
          name: payload.name,
          category: payload.category,
          price: payload.price,
          description: payload.description,
          image_emoji: payload.image_emoji,
          hotel_id: currentHotel.id,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/services');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🚀 NUEVO MOTOR POS (Alineado con tu esquema service_orders)
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

    if (error) throw new Error(error.message);

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

    const { error } = await supabaseAdmin.from('service_orders').insert([
      {
        hotel_id: currentHotel.id,
        room_id: roomId, // Usamos tu columna room_id
        items: description, // Guardamos la lista de platos aquí
        total_price: amount,
        status: 'pending',
        payment_method: 'room_charge',
      }
    ]);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/checkout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 3. COBRO INMEDIATO (Cliente de Paso / Walk-in)
export async function processWalkInChargeAction(amount: number, description: string) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('No autorizado');

    const cookieStore = await cookies();
    const staffCookie = cookieStore.get('hospeda_staff_session');
    const staffId = staffCookie ? JSON.parse(staffCookie.value).id : null;

    const { error } = await supabaseAdmin.from('payments').insert([
      {
        amount: amount,
        method: 'cash',
        notes: `Walk-in POS: ${description}`,
        staff_id: staffId,
      }
    ]);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (error: any) {
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

    if (error) throw new Error(error.message);

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}