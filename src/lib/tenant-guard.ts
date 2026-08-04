/**
 * 🔒 Tenant Guard — Wrapper obligatorio para queries multi-tenant
 *
 * Elimina la posibilidad de olvidar el filtro `hotel_id` en las queries.
 * SIEMPRE se debe usar esta función en lugar de `supabase.from().select()`
 * directo cuando se accede a datos de un hotel específico.
 *
 * Uso:
 *   // ❌ MAL (puede olvidar el filtro):
 *   const { data } = await supabase.from('rooms').select('*');
 *
 *   // ✅ BIEN (obligatorio):
 *   const { data } = await tenantQuery(supabase.from('rooms').select('*'), hotelId);
 */

import { cookies } from 'next/headers';
import { verifySession, type StaffSession } from '@/lib/session-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface TenantGuardResult {
  allowed: boolean;
  session: StaffSession | null;
  error?: string;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Verifies that the current user has access to the specified hotel.
 * Returns session if allowed, error if not.
 *
 * Use this at the start of any action that accesses hotel-specific data.
 */
export async function requireHotelAccess(
  hotelId: string
): Promise<TenantGuardResult> {
  try {
    const cookieStore = await cookies();
    const staffCookie = cookieStore.get('hospeda_staff_session');
    
    if (!staffCookie?.value) {
      return { allowed: false, session: null, error: 'No session found' };
    }

    const session = verifySession(staffCookie.value);
    
    if (!session) {
      return { allowed: false, session: null, error: 'Invalid session' };
    }

    // Check hotel_id ownership
    if (session.hotel_id !== hotelId) {
      return { 
        allowed: false, 
        session, 
        error: 'Access denied: hotel_id mismatch' 
      };
    }

    return { allowed: true, session };
  } catch {
    return { allowed: false, session: null, error: 'Session verification failed' };
  }
}

/**
 * Applies automatic `hotel_id` filter to any Supabase query.
 *
 * @param query - The Supabase query (e.g., `supabase.from('rooms').select('*')`)
 * @param hotelId - The current hotel ID (tenant)
 * @returns The query with filter applied
 */
export function tenantQuery<T>(
  query: any,
  hotelId: string
) {
  return query.eq('hotel_id', hotelId) as typeof query;
}

/**
 * Applies `hotel_id` filter for insert queries.
 * Ensures data is inserted with the correct tenant.
 */
export function tenantInsert<T extends { hotel_id?: string }>(
  data: T,
  hotelId: string
): T & { hotel_id: string } {
  return { ...data, hotel_id: hotelId };
}
