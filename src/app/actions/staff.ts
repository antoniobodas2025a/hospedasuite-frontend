'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentHotel } from '@/lib/hotel-context';
import { checkStaffLimit } from '@/data/plan-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hashPin } from '@/lib/pin-security';

export async function createStaffAction(formData: FormData) {
  try {
    const hotel = await getCurrentHotel();
    if (!hotel) throw new Error('No autorizado');

    // ─── Plan Gating: Check staff limit ─────────────────────────
    const limitCheck = await checkStaffLimit(hotel.id)
    if (!limitCheck.ok) {
      return { success: false, error: limitCheck.reason }
    }

    const name = formData.get('name') as string;
    const role = formData.get('role') as string;
    const pin_code = formData.get('pin_code') as string;

    if (pin_code.length !== 4) throw new Error('El PIN debe tener exactamente 4 dígitos');

    // Hash del PIN antes de almacenar (SRP: pin-security.ts maneja el hashing)
    const hashedPin = await hashPin(pin_code);

    // Validación: Verificar que el PIN no exista ya en ESTE hotel
    // Comparamos contra PINs hasheados y legacy (texto plano)
    const { data: staffList } = await supabaseAdmin
      .from('staff')
      .select('id, pin_code')
      .eq('hotel_id', hotel.id);

    // Verificar duplicados (soporta hash y texto plano)
    for (const member of staffList || []) {
      const storedPin = member.pin_code as string;
      if (storedPin.length === 64) {
        // Es un hash — comparamos hashes
        if (storedPin === hashedPin) {
          throw new Error('Este PIN ya está siendo usado por otro miembro del equipo.');
        }
      } else {
        // Legacy: texto plano
        if (storedPin === pin_code) {
          throw new Error('Este PIN ya está siendo usado por otro miembro del equipo.');
        }
      }
    }

    const { error } = await supabaseAdmin.from('staff').insert([{
      hotel_id: hotel.id,
      name,
      role,
      pin_code: hashedPin // Almacenamos el hash, no el texto plano
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

    // ─── Protección del Último Administrador (Heurística #5) ───
    // Verificar si el staff a eliminar es un Administrador
    const { data: staffToDelete } = await supabaseAdmin
      .from('staff')
      .select('id, role')
      .eq('id', staffId)
      .eq('hotel_id', hotel.id)
      .single();

    if (!staffToDelete) throw new Error('Miembro no encontrado.');

    if (staffToDelete.role === 'Administrador') {
      // Contar cuántos admins quedan en este hotel
      const { count: adminCount } = await supabaseAdmin
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotel.id)
        .eq('role', 'Administrador');

      if (adminCount !== null && adminCount <= 1) {
        return { 
          success: false, 
          error: 'No puedes eliminar al único administrador del hotel. Debe haber al menos uno con acceso total.' 
        };
      }
    }

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
