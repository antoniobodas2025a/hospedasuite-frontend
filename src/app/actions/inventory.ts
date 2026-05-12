'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { RoomSchema } from '@/lib/validations/inventory';
import { getCurrentHotel } from '@/lib/hotel-context';

/**
 * Constructor de Cliente Administrativo
 * Utiliza el Service Role Key para bypass de RLS en operaciones de escritura protegidas.
 */
const getAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error('❌ Fallo crítico de entorno (Supabase Keys Missing)');

  return createClient(url, key, { auth: { persistSession: false } });
};

/**
 * saveRoomAction: Motor de persistencia para el nodo de inventario.
 * Soporta creación y actualización atómica con integridad Multi-Tenant.
 */
export async function saveRoomAction(hotelId: string, data: any, roomId?: string) {
  try {
    // 🛡️ BARRERA DE SEGURIDAD TIER-1: Verificación de pertenencia de Tenant
    const currentHotel = await getCurrentHotel();
    if (!currentHotel || currentHotel.id !== hotelId) {
      throw new Error("SEC_VIOLATION: Acceso no autorizado al hotel solicitado.");
    }

    const supabaseAdmin = getAdminClient();
    
    // 🛡️ PAYLOAD BLINDADO: Estructuración determinista de datos para Postgres
    // Aseguramos que 'gallery' y 'amenities' viajen como arreglos válidos.
    const payload = {
      hotel_id: hotelId,
      name: data.name,
      capacity: Number(data.capacity),
      price: Number(data.price),
      status: data.status,
      description: data.description,
      gallery: Array.isArray(data.gallery) ? data.gallery : [], // Persistencia de URLs WebP
      amenities: Array.isArray(data.amenities) ? data.amenities : [],
      ical_import_url: data.ical_import_url || null,
      size_sqm: data.size_sqm ? Number(data.size_sqm) : null
    };

    if (roomId) {
      // Rama de Actualización
      const { error } = await supabaseAdmin
        .from('rooms')
        .update(payload)
        .eq('id', roomId);
        
      if (error) throw new Error(`DB_UPDATE_ERROR: ${error.message}`);
    } else {
      // Rama de Creación
      const { error } = await supabaseAdmin
        .from('rooms')
        .insert([payload]);
        
      if (error) throw new Error(`DB_INSERT_ERROR: ${error.message}`);
    }

    /**
     * PURGA DE CACHÉ DE NEXT.JS
     * Obliga al enrutador a invalidar los segmentos de inventario, 
     * housekeeping y calendario para reflejar la mutación de inmediato.
     */
    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard/calendar');
    
    return { success: true };

  } catch (error: any) {
    console.error("🔥 [INVENTORY_ACTION_FAILURE]:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * deleteRoomAction: Eliminación física de nodo de inventario.
 * Incluye verificación de propiedad antes de la ejecución.
 */
export async function deleteRoomAction(id: string) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error("AUTH_ERROR: Sesión administrativa no válida.");

    const supabaseAdmin = getAdminClient();
    
    // 🛡️ VERIFICACIÓN PRE-VUELO: ¿La habitación pertenece al hotel del usuario?
    const { data: room, error: fetchError } = await supabaseAdmin
      .from('rooms')
      .select('hotel_id')
      .eq('id', id)
      .single();

    if (fetchError || !room || room.hotel_id !== currentHotel.id) {
       throw new Error("SEC_VIOLATION: Intento de alteración de nodo externo o inexistente.");
    }

    const { error: deleteError } = await supabaseAdmin
      .from('rooms')
      .delete()
      .eq('id', id);

    if (deleteError) throw new Error(`DB_DELETE_ERROR: ${deleteError.message}`);
    
    revalidatePath('/dashboard/inventory');
    return { success: true };

  } catch (error: any) {
    console.error("🔥 [DELETE_ACTION_FAILURE]:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * generateIcalToken: Función pura que genera un token UUID v4 para la
 * exportación iCal pública. Se extrae como función pura para testeo sin
 * dependencias de entorno.
 */
export async function generateIcalToken(): Promise<string> {
  return crypto.randomUUID();
}

/**
 * regenerateIcalTokenAction: Regenera el ical_export_token de una habitación.
 * El token se usa en la URL pública de exportación iCal:
 *   /api/webhooks/tenant/ical/{token}
 *
 * 🛡️ Verifica hotel ownership antes de la mutación.
 */
export async function regenerateIcalTokenAction(roomId: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    // 🛡️ BARRERA DE SEGURIDAD TIER-1: Verificación de pertenencia de Tenant
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) {
      throw new Error("AUTH_ERROR: Sesión administrativa no válida.");
    }

    const supabaseAdmin = getAdminClient();

    // 🛡️ VERIFICACIÓN PRE-VUELO: ¿La habitación pertenece al hotel del usuario?
    const { data: room, error: fetchError } = await supabaseAdmin
      .from('rooms')
      .select('hotel_id')
      .eq('id', roomId)
      .single();

    if (fetchError || !room || room.hotel_id !== currentHotel.id) {
      throw new Error("SEC_VIOLATION: Intento de alteración de nodo externo o inexistente.");
    }

    // 🔑 Generar nuevo token
    const newToken = await generateIcalToken();

    // 💾 Persistir en la base de datos
    const { error: updateError } = await supabaseAdmin
      .from('rooms')
      .update({ ical_export_token: newToken })
      .eq('id', roomId);

    if (updateError) throw new Error(`DB_UPDATE_ERROR: ${updateError.message}`);

    revalidatePath('/dashboard/inventory');

    return { success: true, token: newToken };

  } catch (error: any) {
    console.error("🔥 [ICAL_TOKEN_ACTION_FAILURE]:", error.message);
    return { success: false, error: error.message };
  }
}