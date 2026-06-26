'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * Obtiene TODAS las propiedades (hotels) a las que el usuario actual tiene acceso.
 * Permite construir el selector "Mis Propiedades" en el sidebar.
 */
export async function getMyHotelsAction() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'No autenticado', hotels: [] };
  }

  // Obtener todos los hotels via tabla staff (fuente de verdad)
  const { data: staffRecords, error: staffError } = await supabase
    .from('staff')
    .select('hotel_id, role, hotels(id, name, city, slug, subscription_plan, subscription_status)')
    .eq('user_id', user.id)
    .order('name', { foreignTable: 'hotels' });

  if (staffError) {
    return { success: false, error: staffError.message, hotels: [] };
  }

  const hotels = (staffRecords || []).map((record: any) => ({
    id: record.hotels?.id || record.hotel_id,
    name: record.hotels?.name || 'Sin nombre',
    city: record.hotels?.city || '',
    slug: record.hotels?.slug || '',
    subscription_plan: record.hotels?.subscription_plan || 'starter',
    subscription_status: record.hotels?.subscription_status || 'trialing',
    role: record.role,
  }));

  return { success: true, hotels };
}

/**
 * Cambia la propiedad activa. Setea la cookie `hospeda_active_tenant`
 * y redirige al dashboard para re-renderizar con el nuevo contexto.
 */
export async function switchPropertyAction(formData: FormData) {
  const hotelId = formData.get('hotelId') as string;
  const cookieStore = await cookies();

  if (!hotelId) {
    return { success: false, error: 'Hotel ID requerido' };
  }

  // Verificar que el usuario tiene acceso a este hotel
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'No autenticado' };
  }

  const { data: staffRecord } = await supabase
    .from('staff')
    .select('hotel_id')
    .eq('user_id', user.id)
    .eq('hotel_id', hotelId)
    .maybeSingle();

  if (!staffRecord) {
    return { success: false, error: 'No tienes acceso a esta propiedad' };
  }

  cookieStore.set('hospeda_active_tenant', hotelId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });

  return { success: true };
}
