'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createGuestAction(guestData: any) {
  try {
    const { data, error } = await supabaseAdmin.from('guests').insert([guestData]).select().single();
    if (error) throw error;
    revalidatePath('/dashboard/guests');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateGuestAction(id: string, guestData: any) {
  try {
    const { error } = await supabaseAdmin.from('guests').update(guestData).eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard/guests');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteGuestAction(id: string) {
  try {
    const { error } = await supabaseAdmin.from('guests').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard/guests');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}