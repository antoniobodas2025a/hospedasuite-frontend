import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { Hotel } from '@/types';
import { verifySession, signSession, getSessionCookieOptions } from '@/lib/session-utils';
import type { StaffSession } from '@/lib/session-utils';

// Memoización de la solicitud para evitar redundancia de I/O en la misma renderización (RSC)
// Garantiza que el contexto sea único por ciclo de vida de la solicitud (request lifecycle)
export const getCurrentHotel = cache(async (): Promise<Hotel> => {
  const supabase = await createClient();
  const cookieStore = await cookies();

  // 1. Verificación Criptográfica de Identidad (Zero Trust)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn('🛡️ [HotelContext] Anomalía de autenticación detectada. Abortando contexto.');
    redirect('/login');
  }

  // 2. Extracción de Contexto Determinista (Multi-Tenant Support)
  const activeTenantId = cookieStore.get('hospeda_active_tenant')?.value;

  // 3. Resolución del hotel via tabla staff (fuente de verdad para multi-tenant)
  // Esto funciona independientemente de owner_id
  let hotelQuery = supabase
    .from('staff')
    .select('id, name, role, hotel_id, hotels(*)')
    .eq('user_id', user.id);

  if (activeTenantId) {
    hotelQuery = hotelQuery.eq('hotel_id', activeTenantId);
  } else {
    hotelQuery = hotelQuery.order('created_at', { ascending: true, foreignTable: 'hotels' });
  }

  const { data: staffRecord, error: staffError } = await hotelQuery.limit(1).maybeSingle();

  if (staffError) {
    console.error('❌ [HotelContext] Fallo en la capa de datos PostgREST:', staffError.message);
    throw new Error('Inconsistencia crítica en la resolución del Tenant.');
  }

  const hotel = staffRecord?.hotels as Hotel | undefined;

  // 4. Manejo de Estado Huérfano y Auto-Sanación
  if (!hotel) {
    // Superadmins no necesitan hotel vinculado — van al panel admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (roleData?.role === 'superadmin') {
      redirect('/admin');
    }
    
    console.warn(`⚠️ [HotelContext] Identidad ${user.id} validada sin propiedad vinculada.`);
    // Redirección determinista al embudo de creación (Onboarding)
    redirect('/software/onboarding'); 
  }

  // 5. 🛡️ SLIDING WINDOW: Re-firmar cookie de staff en cada page load
  //    Elimina el bug de expiración a las 12h que causaba SEC_VIOLATION en mutations.
  //    staffRecord is guaranteed non-null here because hotel was resolved from it above.
  const staff = staffRecord!;
  const staffCookie = cookieStore.get('hospeda_staff_session');
  if (staffCookie) {
    const existingSession = verifySession(staffCookie.value);
    if (existingSession && existingSession.hotel_id === hotel.id) {
      // Cookie válida — re-firmar extendiendo maxAge
      cookieStore.set('hospeda_staff_session', signSession(existingSession), getSessionCookieOptions());
    } else {
      // Cookie corrupta o hotel mismatch — regenerar desde staff record
      cookieStore.set('hospeda_staff_session', signSession({
        id: staff.id,
        name: staff.name || user.email || '',
        role: staff.role || 'admin',
        hotel_id: hotel.id,
      }), getSessionCookieOptions());
    }
  } else {
    // Cookie ausente — crear nueva desde el staff record de Supabase
    cookieStore.set('hospeda_staff_session', signSession({
      id: staff.id,
      name: staff.name || user.email || '',
      role: staff.role || 'admin',
      hotel_id: hotel.id,
    }), getSessionCookieOptions());
  }

  return hotel;
});

// ============================================================================
// Staff Context — Resuelve hotel e identidad desde cookie de sesión operativa
// ============================================================================

export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  try {
    const cookieStore = await cookies();
    const staffCookie = cookieStore.get('hospeda_staff_session');
    if (!staffCookie) return null;
    
    // Verify signed session (returns null if tampered)
    return verifySession(staffCookie.value);
  } catch {
    return null;
  }
});

export const getStaffHotel = cache(async (): Promise<Hotel | null> => {
  const session = await getStaffSession();
  if (!session) return null;

  const { supabaseAdmin } = await import('@/lib/supabase-admin');
  
  const { data: hotel, error } = await supabaseAdmin
    .from('hotels')
    .select('*')
    .eq('id', session.hotel_id)
    .single();

  if (error || !hotel) return null;
  return hotel as Hotel;
});
