import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

// Memoización de la solicitud para evitar redundancia de I/O en la misma renderización (RSC)
// Garantiza que el contexto sea único por ciclo de vida de la solicitud (request lifecycle)
export const getCurrentHotel = cache(async () => {
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
  // Permite la coexistencia de múltiples propiedades bajo un mismo owner_id
  const activeTenantId = cookieStore.get('hospeda_active_tenant')?.value;

  // 3. Construcción Dinámica del AST de Consulta
  let query = supabase.from('hotels').select('*').eq('owner_id', user.id);

  if (activeTenantId) {
    // Escenario A: Contexto explícito definido por selección de usuario
    query = query.eq('id', activeTenantId);
  } else {
    // Escenario B: Contexto implícito (Fallback al hotel principal por orden de creación)
    query = query.order('created_at', { ascending: true });
  }

  // 🚨 PROTECCIÓN FORENSE CONTRA ERRORES DE COERCIÓN JSON
  // Evita el error "Cannot coerce the result to a single JSON object"
  // Forzamos la cardinalidad 1:1 a nivel de motor de base de datos
  const { data: hotel, error: dbError } = await query.limit(1).maybeSingle();

  if (dbError) {
    console.error('❌ [HotelContext] Fallo en la capa de datos PostgREST:', dbError.message);
    throw new Error('Inconsistencia crítica en la resolución del Tenant.');
  }

  // 4. Manejo de Estado Huérfano y Auto-Sanación
  if (!hotel) {
    console.warn(`⚠️ [HotelContext] Identidad ${user.id} validada sin propiedad vinculada.`);
    // Redirección determinista al embudo de creación (Onboarding)
    redirect('/software/onboarding'); 
  }

  return hotel;
});