'use server'

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { generateUniqueSlug } from '@/lib/slug';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireSuperAdmin } from '@/lib/auth-guards';
import { logAuditEvent } from '@/lib/audit-logger';
import { createClient } from '@/utils/supabase/server';

/**
 * ACCIÓN 1: Crear nuevo Hotel y Usuario Dueño (Transacción Atómica con Rollback)
 */
export async function createHotelAction(formData: FormData) {
  await requireSuperAdmin();

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const plan = formData.get('plan') as string;

  let createdAuthId: string | null = null;
  let createdHotelId: string | null = null;

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
    const slug = await generateUniqueSlug(name, async (s) => {
      const { data } = await supabaseAdmin
        .from('hotels')
        .select('id')
        .eq('slug', s)
        .maybeSingle();
      return !!data;
    });

    const { data: hotelData, error: dbError } = await supabaseAdmin.from('hotels').insert({
      name,
      email,
      location: 'Por definir',
      city: 'Por definir', // FIX: Set city so hotel appears in location search
      owner_id: createdAuthId,
      subscription_plan: plan,
      status: 'active',
      slug,
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

    // 🔍 Audit: hotel creation
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'hotel_created',
      entity_type: 'hotel',
      entity_id: createdHotelId!,
      old_value: null,
      new_value: { name, email, plan, slug: slug ?? undefined },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });
    
  } catch (error: any) {
    console.error('⚠️ [Rollback] Error en creación:', error.message);
    // Transacción Compensatoria (Rollback Manual) para preservar la integridad del sistema
    if (createdHotelId) await supabaseAdmin.from('hotels').delete().eq('id', createdHotelId);
    if (createdAuthId) await supabaseAdmin.auth.admin.deleteUser(createdAuthId);
    throw error;
  }
}

/**
 * ACCIÓN 2: Generar enlace de acceso directo (God Mode)
 */
export async function godModeAccess(email: string) {
  await requireSuperAdmin();

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: { redirectTo: `${baseUrl}/dashboard` }
    });

    if (error) throw error;

    // 🔍 Audit: god mode access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'god_mode_access',
      entity_type: 'user',
      entity_id: email,
      old_value: null,
      new_value: { email, link_generated: true },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

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
  await requireSuperAdmin();

  try {
    // 📸 Snapshot pre-mutación para auditoría
    const { data: current } = await supabaseAdmin
      .from('hotels')
      .select('name, status, subscription_plan')
      .eq('id', hotelId)
      .single();

    const { error } = await supabaseAdmin
      .from('hotels')
      .update(updateData)
      .eq('id', hotelId);

    if (error) throw error;

    // 🔍 Audit: tenant update
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'tenant_updated',
      entity_type: 'hotel',
      entity_id: hotelId,
      old_value: current ? { name: current.name, status: current.status, subscription_plan: current.subscription_plan } : null,
      new_value: updateData as Record<string, unknown>,
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

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
  await requireSuperAdmin();

  try {
    if (!ownerId) throw new Error("ID de propietario no encontrado");
    
    const { error } = await supabaseAdmin.auth.admin.updateUserById(ownerId, { 
      password: newPassword 
    });

    if (error) throw error;

    // 🔍 Audit: forced password change
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'password_forced',
      entity_type: 'user',
      entity_id: ownerId,
      old_value: null,
      new_value: { password_changed: true },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

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
  await requireSuperAdmin();

  try {
    console.log(`☢️ INICIANDO BORRADO NUCLEAR: ${hotelId}`);

    // 📸 Snapshot pre-borrado para auditoría
    const { data: hotelSnapshot } = await supabaseAdmin
      .from('hotels')
      .select('*')
      .eq('id', hotelId)
      .single();

    // Reconocimiento de registros dependientes
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('hotel_id', hotelId);
    
    const bookingIds = bookings?.map((b: any) => b.id) || [];

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

    // 🔍 Audit: hotel deletion
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'hotel_deleted',
      entity_type: 'hotel',
      entity_id: hotelId,
      old_value: (hotelSnapshot as Record<string, unknown>) ?? null,
      new_value: null,
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin');
    return { success: true };

  } catch (error: any) {
    console.error('❌ Error Crítico en Borrado Nuclear:', error.message);
    return { success: false, error: error.message };
  }
}