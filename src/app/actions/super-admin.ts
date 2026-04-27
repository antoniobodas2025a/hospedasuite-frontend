'use server'

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

/**
 * 🛡️ CONFIGURACIÓN DE SEGURIDAD NIVEL 0
 * Cliente Admin para bypass de RLS y gestión de Auth (Service Role).
 * Deshabilitamos persistSession para entornos Serverless Edge.
 */
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
 * ACCIÓN 1: Crear nuevo Hotel y Usuario Dueño (Transacción Atómica con Rollback)
 */
export async function createHotelAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const plan = formData.get('plan') as string;

  let createdAuthId = null;
  let createdHotelId = null;

  try {
    // 1. Crear Usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'owner' }
    });

    if (authError) throw authError;
    createdAuthId = authUser.user.id;

    // 2. Crear Hotel vinculado al usuario y RECUPERAR el ID
    const { data: hotelData, error: dbError } = await supabaseAdmin.from('hotels').insert({
      name,
      email,
      location: 'Por definir',
      owner_id: createdAuthId,
      subscription_plan: plan,
      status: 'active',
      slug: name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
    }).select('id').single();

    if (dbError) throw dbError;
    createdHotelId = hotelData.id;

    // 3. 🚀 RESTAURACIÓN DEL PUENTE DE IDENTIDAD
    // Vinculamos el staff inicial con el UUID de Auth para que el Wizard sea accesible.
    const { error: staffError } = await supabaseAdmin.from('staff').insert({
      hotel_id: createdHotelId,
      user_id: createdAuthId, // VINCULACIÓN CRÍTICA
      name: 'Administrador (Dueño)',
      role: 'admin',
      pin_code: '1020'
    });

    if (staffError) throw staffError;

    revalidatePath('/admin');
    return { success: true };
    
  } catch (error: any) {
    console.error('⚠️ [Rollback] Error en creación:', error.message);
    // Transacción Compensatoria (Rollback Manual) para preservar la integridad del sistema
    if (createdHotelId) await supabaseAdmin.from('hotels').delete().eq('id', createdHotelId);
    if (createdAuthId) await supabaseAdmin.auth.admin.deleteUser(createdAuthId);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 2: Generar enlace de acceso directo (God Mode)
 */
export async function godModeAccess(email: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: { redirectTo: `${baseUrl}/dashboard` }
    });

    if (error) throw error;
    return { success: true, url: data.properties.action_link }; 
  } catch (error: any) {
    console.error('GodMode Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 3: Editar Datos del Tenant
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
    console.error('Update Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 4: Forzar Cambio de Contraseña (Capa de Seguridad Crítica)
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
    console.error('Password Reset Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 5: Eliminar Hotel (BORRADO NUCLEAR DE 10 NIVELES)
 * Ejecuta desmantelamiento de grafo en orden inverso para satisfacer FKs.
 */
export async function deleteHotelAction(hotelId: string, ownerId: string | null | undefined) {
  try {
    console.log(`☢️ INICIANDO BORRADO NUCLEAR: ${hotelId}`);

    // Reconocimiento de registros dependientes
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('hotel_id', hotelId);
    
    const bookingIds = bookings?.map(b => b.id) || [];

    // Purga de Ledger Financiero
    if (bookingIds.length > 0) {
      await supabaseAdmin.from('service_items').delete().in('booking_id', bookingIds);
      await supabaseAdmin.from('payments').delete().in('booking_id', bookingIds);
    }

    // Purga de Matriz Operativa y Topología
    await supabaseAdmin.from('bookings').delete().eq('hotel_id', hotelId);
    await supabaseAdmin.from('inventory').delete().eq('hotel_id', hotelId);
    await supabaseAdmin.from('menu_items').delete().eq('hotel_id', hotelId);
    await supabaseAdmin.from('services').delete().eq('hotel_id', hotelId);
    await supabaseAdmin.from('guests').delete().eq('hotel_id', hotelId);
    await supabaseAdmin.from('rooms').delete().eq('hotel_id', hotelId);
    await supabaseAdmin.from('staff').delete().eq('hotel_id', hotelId);

    // Erradicación de Registro Maestro
    const { error: dbError } = await supabaseAdmin.from('hotels').delete().eq('id', hotelId);
    if (dbError) throw dbError;

    // Erradicación de Identidad en Auth
    if (ownerId && ownerId.trim() !== '') {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(ownerId);
      if (authError) console.warn('Aviso: Usuario de Auth ya inexistente o inaccesible.');
    }

    console.log(`✅ Tenant ${hotelId} erradicado satisfactoriamente.`);
    revalidatePath('/admin');
    return { success: true };

  } catch (error: any) {
    console.error('❌ Error Crítico en Borrado Nuclear:', error.message);
    return { success: false, error: error.message };
  }
}