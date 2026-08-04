'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireHotelAccess } from '@/lib/tenant-guard';

// Definimos la interfaz de entrada
interface LeadInput {
  business_name: string;
  phone: string;
  notes: string;
  city_search?: string;
}

// 1. Acción para CREAR un nuevo Lead
export async function createLeadAction(hotelId: string, lead: LeadInput) {
  try {
    // 🛡️ TENANT GUARD: Verify hotel ownership via staff session
    const { allowed, error: guardError } = await requireHotelAccess(hotelId);
    if (!allowed) {
      return { success: false, error: guardError };
    }

    const { data, error } = await supabaseAdmin
      .from('hunted_leads')
      .insert([{ ...lead, hotel_id: hotelId, status: 'new' }])
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/marketing'); // Actualiza el tablero
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. Acción para MOVER (Actualizar Estado)
export async function updateLeadStatusAction(
  hotelId: string,
  leadId: number,
  newStatus: string,
) {
  try {
    // 🛡️ TENANT GUARD: Verify hotel ownership via staff session
    const { allowed, error: guardError } = await requireHotelAccess(hotelId);
    if (!allowed) {
      return { success: false, error: guardError };
    }

    const { error } = await supabaseAdmin
      .from('hunted_leads')
      .update({ status: newStatus })
      .eq('id', leadId)
      .eq('hotel_id', hotelId); // Ensure lead belongs to hotel

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/marketing');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
