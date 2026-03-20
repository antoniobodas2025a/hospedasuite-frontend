'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createStaffAction(formData: FormData) {
  try {
    const hotel = await getCurrentHotel();
    if (!hotel) throw new Error('No autorizado');

    const name = formData.get('name') as string;
    const role = formData.get('role') as string;
    const pin_code = formData.get('pin_code') as string;

    if (pin_code.length !== 4) throw new Error('El PIN debe tener exactamente 4 dígitos');

    // Validación: Verificar que el PIN no exista ya en ESTE hotel
    const { data: existingPin } = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('hotel_id', hotel.id)
      .eq('pin_code', pin_code)
      .single();

    if (existingPin) throw new Error('Este PIN ya está siendo usado por otro miembro del equipo.');

    const { error } = await supabaseAdmin.from('staff').insert([{
      hotel_id: hotel.id,
      name,
      role,
      pin_code
    }]);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteStaffAction(staffId: string) {
  try {
    const hotel = await getCurrentHotel();
    if (!hotel) throw new Error('No autorizado');

    const { error } = await supabaseAdmin
      .from('staff')
      .delete()
      .eq('id', staffId)
      .eq('hotel_id', hotel.id); // Seguridad extra: solo borra si es de este hotel

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}