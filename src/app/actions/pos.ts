'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';
import { cookies } from 'next/headers';

// 🛡️ Cliente administrativo solo para operaciones de Staff/Auth cruzada
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProductPayload {
  hotel_id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  image_emoji: string;
}

export async function createProductAction(payload: ProductPayload) {
  try {
    const hotel = await getCurrentHotel();
    if (!hotel || hotel.id !== payload.hotel_id) {
      throw new Error('AUTH_ERROR: Nodo no autorizado.');
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('menu_items')
      .insert([{
        name: payload.name.trim(),
        category: payload.category,
        price: payload.price,
        description: payload.description,
        image_emoji: payload.image_emoji || '📦',
        hotel_id: hotel.id,
      }])
      .select().single();

    if (error) throw new Error(`DB_ERROR: ${error.message}`);

    revalidatePath('/dashboard/pos');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMenuAction() {
  try {
    const hotel = await getCurrentHotel();
    if (!hotel) throw new Error('No autorizado');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('hotel_id', hotel.id)
      .order('category', { ascending: true });

    if (error) throw new Error(`DB_ERROR: ${error.message}`);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addServiceChargeAction(payload: {
  bookingId: string;
  roomId: string;
  productIds: (string | number)[]; 
  quantities: number[];            
  description: string;
  amount: number;
}) {
  try {
    const hotel = await getCurrentHotel();
    if (!hotel) throw new Error('AUTH_ERROR: Nodo no autorizado.');

    const supabase = await createClient();

    const { data: booking, error: checkErr } = await supabase
      .from('bookings')
      .select('status')
      .eq('id', payload.bookingId)
      .eq('hotel_id', hotel.id)
      .single();

    if (checkErr || !booking) throw new Error('BOOKING_NOT_FOUND: El nodo destino no existe.');
    if (booking.status !== 'checked_in') {
      throw new Error(`INVALID_STATE: Solo se pueden cargar consumos a huéspedes activos.`);
    }

    const { error: rpcError } = await supabase.rpc('process_atomic_cart_sale', {
      p_booking_id: payload.bookingId,
      p_room_id: payload.roomId,
      p_product_ids: payload.productIds,
      p_quantities: payload.quantities,
      p_total_amount: payload.amount,
      p_description: payload.description
    });

    if (rpcError) {
      if (rpcError.message.includes('OUT_OF_STOCK')) {
        throw new Error('INVENTARIO AGOTADO: Uno o más productos del carrito no tienen stock suficiente.');
      }
      throw new Error(`TRANSACTION_FAILED: ${rpcError.message}`);
    }

    revalidatePath('/dashboard/checkout');
    revalidatePath('/dashboard/calendar'); 
    revalidatePath('/dashboard/pos');

    return { success: true };
  } catch (error: any) {
    console.error('🚨 POS_ACID_BULK_ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🛡️ ACCIÓN POS: COBROS WALK-IN CON DEDUCCIÓN ATÓMICA DE STOCK
 */
export async function processWalkInChargeAction(payload: {
  amount: number;
  description: string;
  productIds: (string | number)[]; // 👈 Requerido para deducción atómica
  quantities: number[];            // 👈 Requerido para deducción atómica
}) {
  try {
    const hotel = await getCurrentHotel();
    if (!hotel) throw new Error('No autorizado');
    
    if (payload.amount < 0) throw new Error('Operación rechazada: Monto negativo.');

    const cookieStore = await cookies();
    const staffCookie = cookieStore.get('hospeda_staff_session');
    
    let staffId = null;
    try {
      if (staffCookie?.value) {
        staffId = JSON.parse(staffCookie.value).id;
      }
    } catch (e) {
      console.warn('⚠️ Staff session corrupta.');
    }

    const supabase = await createClient();

    // 1. Ejecución RPC Bulk (Atómica) para descontar stock
    // Pasamos NULL para booking_id y room_id ya que es venta de mostrador
    const { error: rpcError } = await supabase.rpc('process_atomic_cart_sale', {
      p_booking_id: null, 
      p_room_id: null,    
      p_product_ids: payload.productIds,
      p_quantities: payload.quantities,
      p_total_amount: payload.amount,
      p_description: `Walk-in POS: ${payload.description}`
    });

    if (rpcError) {
      if (rpcError.message.includes('OUT_OF_STOCK')) {
        throw new Error('INVENTARIO AGOTADO: No hay stock suficiente para venta de mostrador.');
      }
      throw new Error(`INVENTORY_TRANSACTION_FAILED: ${rpcError.message}`);
    }

    // 2. Si el stock se dedujo correctamente, registramos el pago en caja
    const { error: paymentError } = await supabase.from('payments').insert([{
      amount: payload.amount,
      method: 'cash',
      notes: `Walk-in POS: ${payload.description}`,
      staff_id: staffId,
    }]);

    if (paymentError) {
      // ⚠️ ADVERTENCIA FORENSE: Si esto falla, el stock se descontó pero el dinero no entró a la caja (Ledger Desync).
      // En un sistema puro, ambos inserts deben estar en la MISMA función RPC de Postgres.
      console.error('🚨 LEDGER_DESYNC_RISK: Fallo registro de pago tras deducir stock.', paymentError.message);
      throw new Error(`PAYMENT_RECORD_FAILED: ${paymentError.message}`);
    }

    revalidatePath('/dashboard/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getActiveBookingsForPosAction() {
  try {
    const hotel = await getCurrentHotel();
    if (!hotel) throw new Error('No autorizado');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('id, room_id, rooms(name), guest_id, guests(full_name)')
      .eq('hotel_id', hotel.id)
      .eq('status', 'checked_in');

    if (error) throw new Error(`DB_ERROR: ${error.message}`);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}