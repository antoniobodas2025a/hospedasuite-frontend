import { createClient } from '@/utils/supabase/server';

/**
 * Verifies the current user has role='superadmin' in user_roles.
 * Throws on auth failure or unauthorized role. Silently returns on success.
 */
export async function requireSuperAdmin(): Promise<void> {
  const supabase = await createClient();

  // 1. Verify session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('No autenticado.');
  }

  // 2. Verify superadmin role
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || !roleData || roleData.role !== 'superadmin') {
    throw new Error('No autorizado. Se requiere rol superadmin.');
  }
}
