'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';
import { emitEvent } from '@/lib/events';

export type RoomStatus = 'available' | 'dirty' | 'maintenance' | 'occupied';

/**
 * 🛡️ ACCIÓN DE TRANSICIÓN DE ESTADO FÍSICO
 * Certifica el cambio de estado de la unidad y purga los visualizadores del hotel.
 */
export async function updateRoomStatusAction(roomId: string, newStatus: RoomStatus) {
  try {
    const hotel = await getCurrentHotel();
    if (!hotel) throw new Error('AUTH_ERROR: Nodo no autorizado.');

    const supabase = await createClient();

    // Fetch current status for the event payload
    const { data: currentRoom } = await supabase
      .from('rooms')
      .select('status')
      .eq('id', roomId)
      .eq('hotel_id', hotel.id)
      .single();

    // 1. Mutación Atómica de Estado
    const { error } = await supabase
      .from('rooms')
      .update({ status: newStatus })
      .eq('id', roomId)
      .eq('hotel_id', hotel.id);

    if (error) throw new Error(`DB_ERROR: Fallo al actualizar inventario: ${error.message}`);

    await emitEvent('room.status_changed', {
      roomId: roomId,
      hotelId: hotel.id,
      oldStatus: currentRoom?.status || 'unknown',
      newStatus: newStatus,
    }, {
      hotelId: hotel.id,
      source: 'server-action',
    });

    await (emitEvent as any)('cache.invalidate', {
      paths: ['/dashboard', '/dashboard/calendar'],
      tags: [`rooms-${hotel.id}`],
    }, {
      hotelId: hotel.id,
      source: 'server-action',
    });

    // 2. Protocolo de Revalidación Global
    // Invalida el calendario, el dashboard y el propio panel de limpieza.
    revalidatePath('/dashboard', 'layout'); 
    revalidatePath('/dashboard/calendar');
    
    return { success: true };
  } catch (error: any) {
    console.error('🚨 HOUSEKEEPING_FORENSIC_ERROR:', error.message);
    return { success: false, error: error.message };
  }
}