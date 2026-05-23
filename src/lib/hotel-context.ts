import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { Hotel } from '@/types';

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
    .select('hotel_id, hotels(*)')
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

  return hotel;
});
