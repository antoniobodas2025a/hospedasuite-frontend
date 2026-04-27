'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { RoomSchema, RoomFormValues } from '@/lib/validations/inventory';
import { getCurrentHotel } from '@/lib/hotel-context';

const getAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error('❌ Fallo crítico de entorno (Supabase Keys Missing)');

  return createClient(url, key, { auth: { persistSession: false } });
};

export async function saveRoomAction(hotelId: string, data: RoomFormValues, roomId?: string) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel || currentHotel.id !== hotelId) {
      throw new Error("SEC_VIOLATION: Barrera Multi-Tenant comprometida.");
    }

    const supabaseAdmin = getAdminClient();
    const validData = RoomSchema.parse(data);

    const payload = {
      hotel_id: hotelId,
      name: validData.name,
      capacity: validData.capacity,
      price: validData.price,
      status: validData.status,
      size_sqm: validData.size_sqm,
      gallery: validData.gallery, 
      amenities: validData.amenities
    };

    if (roomId) {
      const { error } = await supabaseAdmin.from('rooms').update(payload).eq('id', roomId);
      if (error) throw new Error(`DB_UPDATE_ERROR: ${error.message}`);
    } else {
      const { error } = await supabaseAdmin.from('rooms').insert([payload]);
      if (error) throw new Error(`DB_INSERT_ERROR: ${error.message}`);
    }

    // Purga global para actualizar Calendario, Housekeeping e Inventario
    revalidatePath('/dashboard', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error("🔥 Error guardando habitación:", error.message);
    return { success: false, error: error.message };
  }
}

export async function deleteRoomAction(id: string) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error("AUTH_ERROR: Acceso denegado.");

    const supabaseAdmin = getAdminClient();
    
    const { data: room } = await supabaseAdmin.from('rooms').select('hotel_id').eq('id', id).single();
    if (!room || room.hotel_id !== currentHotel.id) {
       throw new Error("SEC_VIOLATION: Intento de alteración de nodo externo.");
    }

    const { error } = await supabaseAdmin.from('rooms').delete().eq('id', id);
    if (error) throw new Error(`DB_DELETE_ERROR: ${error.message}`);
    
    revalidatePath('/dashboard', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error("🔥 Error eliminando habitación:", error.message);
    return { success: false, error: error.message };
  }
}