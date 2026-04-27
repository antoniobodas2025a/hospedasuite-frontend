'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';

// 🛡️ Cliente Administrativo (Ignora RLS, por tanto, la seguridad DEBE estar en el código)
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CONTRATO ESTRICTO DE DATOS
export interface GuestPayload {
  full_name: string;
  doc_type: string;
  doc_number: string;
  phone?: string;
  email?: string;
  country?: string;
  notes?: string;
}

export async function createGuestAction(guestData: GuestPayload) {
  try {
    const hotel = await getCurrentHotel();
    if (!hotel) throw new Error('AUTH_ERROR: Acceso denegado a la matriz de identidad.');

    // 1. PREVENCIÓN DE DUPLICADOS (Colisión de Identidad)
    const { data: existing } = await supabaseAdmin
      .from('guests')
      .select('id')
      .eq('hotel_id', hotel.id)
      .eq('doc_number', guestData.doc_number)
      .single();

    if (existing) {
      throw new Error('PII_COLLISION: Ya existe un perfil indexado con este documento en tu hotel.');
    }

    // 2. INSERCIÓN BLINDADA (Zero-Trust)
    const securePayload = {
      ...guestData,
      hotel_id: hotel.id // 🛡️ El servidor dicta la jurisdicción, nunca el cliente
    };

    const { data, error } = await supabaseAdmin
      .from('guests')
      .insert([securePayload])
      .select()
      .single();

    if (error) throw new Error(`DB_INSERT_ERROR: ${error.message}`);

    revalidatePath('/dashboard/guests');
    return { success: true, data };
  } catch (error: any) {
    console.error('🚨 PII_CREATE_ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

export async function updateGuestAction(id: string, guestData: Partial<GuestPayload>) {
  try {
    const hotel = await getCurrentHotel();
    if (!hotel) throw new Error('AUTH_ERROR: Acceso denegado a la matriz de identidad.');

    // 1. VERIFICACIÓN DE PROPIEDAD (Prevención de IDOR)
    const { data: targetGuest, error: fetchErr } = await supabaseAdmin
      .from('guests')
      .select('hotel_id')
      .eq('id', id)
      .single();

    if (fetchErr || !targetGuest || targetGuest.hotel_id !== hotel.id) {
      throw new Error('SEC_VIOLATION: Intento de alteración de identidad externa bloqueado.');
    }

    // 2. SANITIZACIÓN DEL PAYLOAD (Evitar inyección de llaves foráneas)
    const safePayload = { ...guestData };
    delete (safePayload as any).hotel_id; // Garantizamos que el hotel_id no pueda cambiar
    delete (safePayload as any).id;

    const { error } = await supabaseAdmin
      .from('guests')
      .update(safePayload)
      .eq('id', id);

    if (error) throw new Error(`DB_UPDATE_ERROR: ${error.message}`);

    revalidatePath('/dashboard/guests');
    revalidatePath('/dashboard/calendar'); // Actualizamos el Gantt por si el nombre cambió
    return { success: true };
  } catch (error: any) {
    console.error('🚨 PII_UPDATE_ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

export async function deleteGuestAction(id: string) {
  try {
    const hotel = await getCurrentHotel();
    if (!hotel) throw new Error('AUTH_ERROR: Acceso denegado a la matriz de identidad.');

    // 1. VERIFICACIÓN DE PROPIEDAD (Prevención de IDOR)
    const { data: targetGuest, error: fetchErr } = await supabaseAdmin
      .from('guests')
      .select('hotel_id')
      .eq('id', id)
      .single();

    if (fetchErr || !targetGuest || targetGuest.hotel_id !== hotel.id) {
      throw new Error('SEC_VIOLATION: Intento de purga de identidad externa bloqueado.');
    }

    // 2. EJECUCIÓN DEL BORRADO
    const { error } = await supabaseAdmin.from('guests').delete().eq('id', id);
    
    if (error) {
      // 3. CAPTURA DE LLAVES FORÁNEAS (Integridad Financiera)
      if (error.code === '23503') {
        throw new Error('PII_LOCKED: Operación abortada. La identidad tiene reservaciones o transacciones activas en el Ledger.');
      }
      throw new Error(`DB_DELETE_ERROR: ${error.message}`);
    }

    revalidatePath('/dashboard/guests');
    return { success: true };
  } catch (error: any) {
    console.error('🚨 PII_DELETE_ERROR:', error.message);
    return { success: false, error: error.message };
  }
}