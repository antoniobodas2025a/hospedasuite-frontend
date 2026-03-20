'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { RoomSchema, RoomFormValues } from '@/lib/validations/inventory';
import { getCurrentHotel } from '@/lib/hotel-context';

const getAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('❌ Faltan las variables de entorno de Supabase en el archivo .env.local');
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  });
};

export async function saveRoomAction(hotelId: string, data: RoomFormValues, roomId?: string) {
  try {
    // 🚨 SEGURIDAD QA: Validar que el usuario actual ES DUEÑO o ADMIN de este hotel
    const currentHotel = await getCurrentHotel();
    if (!currentHotel || currentHotel.id !== hotelId) {
      throw new Error("Violación de Seguridad: No tienes permisos sobre este hotel.");
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
      amenities: validData.amenities, 
    };

    if (roomId) {
      // Editar existente
      const { error } = await supabaseAdmin.from('rooms').update(payload).eq('id', roomId);
      if (error) throw new Error(error.message);
    } else {
      // Crear nueva
      const { data: newRoom, error } = await supabaseAdmin.from('rooms').insert([payload]).select().single();
      if (error) throw new Error(error.message);
      
      // 🚨 CÓDIGO RECUPERADO: Escudo Anti-Bug para Next.js (Turbopack)
      const safeData = JSON.parse(
        JSON.stringify(newRoom, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      );
    }

    revalidatePath('/dashboard/inventory');
    return { success: true };
  } catch (error: any) {
    console.error("🔥 Error guardando habitación:", error);
    return { success: false, error: error.message || "Error de validación" };
  }
}

export async function deleteRoomAction(id: string) {
  try {
    // 🚨 SEGURIDAD QA: Validar propiedad antes de borrar
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error("No autenticado");

    const supabaseAdmin = getAdminClient();
    
    // Validamos que la habitación pertenezca al hotel del usuario
    const { data: room } = await supabaseAdmin.from('rooms').select('hotel_id').eq('id', id).single();
    if (!room || room.hotel_id !== currentHotel.id) {
       throw new Error("Violación de Seguridad: Operación denegada.");
    }

    const { error } = await supabaseAdmin.from('rooms').delete().eq('id', id);
    if (error) throw new Error(error.message);
    
    revalidatePath('/dashboard/inventory');
    return { success: true };
  } catch (error: any) {
    console.error("🔥 Error eliminando habitación:", error);
    return { success: false, error: error.message };
  }
}