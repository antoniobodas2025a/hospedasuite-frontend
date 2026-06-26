'use server'

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { generateUniqueSlug } from '@/lib/slug';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireSuperAdmin } from '@/lib/auth-guards';
import { logAuditEvent } from '@/lib/audit-logger';
import { createClient } from '@/utils/supabase/server';
import { PlanKey, SAAS_PLANS } from '@/config/saas-plans';
import {
  getAllSubscriptions,
  getSubscriptionMetrics,
  getAllUsersWithRoles,
  getSuperadminCount,
} from '@/data/billing';

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

// ═══════════════════════════════════════════════════════════════════════════
// ACCIONES 6-10: Gestión de Suscripciones (Superadmin)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ACCIÓN 6: Listar todas las suscripciones con paginación y filtros.
 */
export async function getSubscriptionsAction(filters: {
  status?: string;
  planKey?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  await requireSuperAdmin();
  return getAllSubscriptions({
    ...filters,
    planKey: filters.planKey as PlanKey | undefined,
  });
}

/**
 * ACCIÓN 7: Cancelar suscripción (cancel_at_period_end = true).
 */
export async function cancelSubscriptionAction(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    // Snapshot pre-mutación
    const { data: current } = await supabaseAdmin
      .from('saas_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (!current) throw new Error('Suscripción no encontrada.');
    if (current.cancel_at_period_end)
      throw new Error('La suscripción ya está pendiente de cancelación.');

    const { error } = await supabaseAdmin
      .from('saas_subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) throw error;

    // Audit
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'subscription_cancelled',
      entity_type: 'subscription',
      entity_id: subscriptionId,
      old_value: { cancel_at_period_end: false },
      new_value: { cancel_at_period_end: true },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/subscriptions');
    return { success: true };
  } catch (error: any) {
    console.error('[Cancel Subscription] Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 8: Reactivar suscripción cancelada (cancel_at_period_end = false).
 */
export async function reactivateSubscriptionAction(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    const { data: current } = await supabaseAdmin
      .from('saas_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (!current) throw new Error('Suscripción no encontrada.');
    if (!current.cancel_at_period_end)
      throw new Error('La suscripción no está pendiente de cancelación.');

    const { error } = await supabaseAdmin
      .from('saas_subscriptions')
      .update({
        cancel_at_period_end: false,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) throw error;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'subscription_reactivated',
      entity_type: 'subscription',
      entity_id: subscriptionId,
      old_value: { cancel_at_period_end: true },
      new_value: { cancel_at_period_end: false },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/subscriptions');
    return { success: true };
  } catch (error: any) {
    console.error('[Reactivate Subscription] Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 9: Extender período de prueba (trial) por N días.
 * Solo aplica a suscripciones con status='trialing'.
 */
export async function extendTrialAction(
  subscriptionId: string,
  days: number
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    const { data: current } = await supabaseAdmin
      .from('saas_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (!current) throw new Error('Suscripción no encontrada.');
    if (current.status !== 'trialing')
      throw new Error('Solo se pueden extender suscripciones en período de prueba.');

    const currentEnd = new Date(current.current_period_end);
    if (isNaN(currentEnd.getTime()))
      throw new Error('La fecha de fin de período actual no es válida.');

    const newEnd = new Date(
      currentEnd.getTime() + days * 24 * 60 * 60 * 1000
    );

    const { error } = await supabaseAdmin
      .from('saas_subscriptions')
      .update({
        current_period_end: newEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) throw error;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'trial_extended',
      entity_type: 'subscription',
      entity_id: subscriptionId,
      old_value: { current_period_end: current.current_period_end },
      new_value: {
        current_period_end: newEnd.toISOString(),
        days_added: days,
      },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/subscriptions');
    return { success: true };
  } catch (error: any) {
    console.error('[Extend Trial] Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 10: Cambiar el plan de una suscripción.
 * Valida que el nuevo plan exista en SAAS_PLANS.
 */
export async function changePlanAction(
  subscriptionId: string,
  newPlanKey: string
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    // Validate plan
    const normalized = newPlanKey as PlanKey;
    if (!SAAS_PLANS[normalized]) {
      return {
        success: false,
        error: `Plan inválido: "${newPlanKey}". Debe ser starter, pro, o enterprise.`,
      };
    }

    const { data: current } = await supabaseAdmin
      .from('saas_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (!current) throw new Error('Suscripción no encontrada.');

    const oldPlan = current.plan_key as PlanKey;

    const { error } = await supabaseAdmin
      .from('saas_subscriptions')
      .update({
        plan_key: normalized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) throw error;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'plan_changed',
      entity_type: 'subscription',
      entity_id: subscriptionId,
      old_value: { plan_key: oldPlan },
      new_value: { plan_key: normalized },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/subscriptions');
    return { success: true };
  } catch (error: any) {
    console.error('[Change Plan] Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 11: Obtener métricas de suscripciones (mrr, churn, trial expiring, etc.).
 */
export async function getSubscriptionMetricsAction() {
  await requireSuperAdmin();
  return getSubscriptionMetrics();
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCIONES 12-15: Gestión de Usuarios y Roles (Superadmin)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ACCIÓN 12: Listar todos los usuarios con sus roles.
 */
export async function getUsersAction() {
  await requireSuperAdmin();
  return getAllUsersWithRoles();
}

/**
 * ACCIÓN 13: Otorgar rol superadmin a un usuario por email.
 */
export async function grantSuperadminRoleAction(
  targetEmail: string
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    // 1. Buscar usuario por email en auth.users
    const { data: usersData, error: lookupError } = await supabaseAdmin
      .schema('auth')
      .from('users')
      .select('id, email')
      .eq('email', targetEmail)
      .limit(1);

    if (lookupError || !usersData || usersData.length === 0) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    const targetUser = usersData[0] as { id: string; email: string };
    const targetUserId = targetUser.id;

    // 2. Verificar que no sea ya superadmin
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('role', 'superadmin')
      .maybeSingle();

    if (existingRole) {
      return { success: false, error: 'El usuario ya es superadmin.' };
    }

    // 3. Insertar rol
    const { error: insertError } = await supabaseAdmin.from('user_roles').insert({
      user_id: targetUserId,
      role: 'superadmin',
    });

    if (insertError) throw insertError;

    // Audit
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'role_granted',
      entity_type: 'user',
      entity_id: targetUserId,
      old_value: null,
      new_value: { role: 'superadmin', target_email: targetEmail },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    console.error('[Grant Superadmin] Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 14: Revocar rol superadmin de un usuario.
 * Bloquea auto-revocación y última-superadmin.
 */
export async function revokeSuperadminRoleAction(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    // Guard: self-revoke
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('No autenticado.');
    if (user.id === targetUserId) {
      return { success: false, error: 'No podés revocar tu propio rol de superadmin.' };
    }

    // Guard: last superadmin
    const superadminCount = await getSuperadminCount();
    if (superadminCount <= 1) {
      return { success: false, error: 'No se puede revocar el último superadmin del sistema.' };
    }

    // Verificar que el target tenga rol superadmin
    const { data: targetRole, error: roleLookupError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('role', 'superadmin')
      .maybeSingle();

    if (roleLookupError || !targetRole) {
      return { success: false, error: 'El usuario no tiene rol superadmin.' };
    }

    // Obtener email del target para auditoría
    let targetEmail: string | null = null;
    try {
      const { data: authUsers } = await supabaseAdmin
        .schema('auth')
        .from('users')
        .select('email')
        .eq('id', targetUserId)
        .limit(1);
      if (authUsers && (authUsers as any[]).length > 0) {
        targetEmail = (authUsers as any[])[0].email;
      }
    } catch {
      // Email opcional para auditoría
    }

    // Revocar: eliminar fila de user_roles
    const { error: deleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', targetUserId)
      .eq('role', 'superadmin');

    if (deleteError) throw deleteError;

    // Audit
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user.id,
      actor_email: user.email,
      action: 'role_revoked',
      entity_type: 'user',
      entity_id: targetUserId,
      old_value: { role: 'superadmin', target_email: targetEmail },
      new_value: null,
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    console.error('[Revoke Superadmin] Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * ACCIÓN 15: Crear nuevo usuario superadmin (auth + role).
 */
export async function createSuperadminAction(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    // 1. Verificar que el usuario no exista
    const { data: existingUser } = await supabaseAdmin
      .schema('auth')
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (existingUser && (existingUser as any[]).length > 0) {
      return { success: false, error: 'Ya existe un usuario con ese email.' };
    }

    // 2. Crear usuario en auth
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) throw authError;

    const newUserId = authUser.user.id;

    // 3. Insertar rol superadmin
    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
      user_id: newUserId,
      role: 'superadmin',
    });

    if (roleError) {
      // Rollback: eliminar el auth user si falla el insert del rol
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw roleError;
    }

    // Audit
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    await logAuditEvent({
      actor_type: 'user',
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'superadmin_created',
      entity_type: 'user',
      entity_id: newUserId,
      old_value: null,
      new_value: { email, role: 'superadmin' },
      ip_address: headersList.get('x-forwarded-for') || 'unknown',
      user_agent: headersList.get('user-agent') || 'unknown',
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    console.error('[Create Superadmin] Error:', error.message);
    return { success: false, error: error.message };
  }
}