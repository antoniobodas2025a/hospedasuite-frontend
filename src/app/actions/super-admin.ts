'use server'

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Cliente Admin para bypass de RLS y gestión de Auth (Service Role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * ACCIÓN 1: Crear nuevo Hotel y Usuario Dueño (Sincronizado con UI)
 */
export async function createHotelAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const plan = formData.get('plan') as string;

  try {
    // 1. Crear Usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'owner' }
    });

    if (authError) throw authError;

    // 2. Crear Hotel vinculado al usuario
    const { error: dbError } = await supabaseAdmin.from('hotels').insert({
      name,
      email,
      location: 'Por definir', // Default
      owner_id: authUser.user.id,
      subscription_plan: plan, // Inyectamos el plan correcto
      status: 'active',
      slug: name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
    });

    if (dbError) throw dbError;

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Error creating hotel:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 2: Generar enlace de acceso directo (God Mode Reparado)
 */
export async function godModeAccess(email: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard` }
    });

    if (error) throw error;
    // Devolvemos 'url' para que el frontend coincida
    return { success: true, url: data.properties.action_link }; 
  } catch (error: any) {
    console.error('GodMode Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 3: Editar Datos del Tenant (Nuevo)
 */
export async function updateTenantAction(hotelId: string, updateData: { name: string, status: string, subscription_plan: string }) {
  try {
    const { error } = await supabaseAdmin
      .from('hotels')
      .update(updateData)
      .eq('id', hotelId);

    if (error) throw error;
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 4: Forzar Cambio de Contraseña (Nuevo)
 */
export async function forceChangePasswordAction(ownerId: string, newPassword: string) {
  try {
    if (!ownerId) throw new Error("ID de propietario no encontrado");
    
    const { error } = await supabaseAdmin.auth.admin.updateUserById(ownerId, { 
      password: newPassword 
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 5: Eliminar Hotel (Limpieza Profunda Nuclear)
 */
export async function deleteHotelAction(hotelId: string, ownerId: string | null | undefined) {
  try {
    console.log(`🧹 Iniciando borrado nuclear del hotel: ${hotelId}`);

    // Eliminación en cascada manual
    await supabaseAdmin.from('bookings').delete().eq('hotel_id', hotelId);
    await supabaseAdmin.from('inventory').delete().eq('hotel_id', hotelId);
    await supabaseAdmin.from('menu_items').delete().eq('hotel_id', hotelId);
    await supabaseAdmin.from('services').delete().eq('hotel_id', hotelId);
    await supabaseAdmin.from('guests').delete().eq('hotel_id', hotelId);
    await supabaseAdmin.from('rooms').delete().eq('hotel_id', hotelId);
    await supabaseAdmin.from('staff').delete().eq('hotel_id', hotelId);

    const { error: dbError } = await supabaseAdmin.from('hotels').delete().eq('id', hotelId);
    if (dbError) throw dbError;

    if (ownerId && ownerId.trim() !== '') {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(ownerId);
      if (authError) console.warn('Usuario de Auth no encontrado o ya eliminado.');
    }

    revalidatePath('/admin');
    return { success: true };

  } catch (error: any) {
    console.error('❌ Error Crítico en Borrado:', error);
    return { success: false, error: error.message };
  }
}