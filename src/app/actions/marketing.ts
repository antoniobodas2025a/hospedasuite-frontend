'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Definimos la interfaz de entrada
interface LeadInput {
  business_name: string;
  phone: string;
  notes: string;
  city_search?: string;
}

// 1. Acción para CREAR un nuevo Lead
export async function createLeadAction(lead: LeadInput) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const { data, error } = await supabaseAdmin
      .from('hunted_leads')
      .insert([{ ...lead, status: 'new' }])
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
  leadId: number,
  newStatus: string,
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const { error } = await supabaseAdmin
      .from('hunted_leads')
      .update({ status: newStatus })
      .eq('id', leadId);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/marketing');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
