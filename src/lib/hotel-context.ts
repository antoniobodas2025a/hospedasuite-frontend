import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';

export const getCurrentHotel = cache(async () => {
  const supabase = await createClient();

  // 1. Verificar Usuario
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log('❌ [HotelContext] No hay usuario logueado. Redirigiendo.');
    redirect('/login');
  }

  console.log(
    `🔍 [HotelContext] Usuario Autenticado: ${user.email} (ID: ${user.id})`,
  );

  // 2. Consulta con Debug
  const { data: hotel, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (error) {
    console.error('❌ [HotelContext] Error de Base de Datos:', error.message);
    console.error(
      '   Detalle: Probablemente RLS o el hotel no existe para este ID.',
    );
  }

  if (!hotel) {
    console.warn(
      `⚠️ [HotelContext] NO SE ENCONTRÓ HOTEL para el usuario ${user.id}`,
    );
    console.log(
      "   Sugerencia: Revisa la tabla 'hotels' en Supabase y confirma que 'owner_id' coincida.",
    );
  } else {
    console.log(`✅ [HotelContext] Éxito! Hotel encontrado: ${hotel.name}`);
  }

  return hotel;
});
