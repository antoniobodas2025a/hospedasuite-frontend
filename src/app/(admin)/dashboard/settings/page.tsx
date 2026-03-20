import SettingsPanel from '@/components/dashboard/SettingsPanel';
import { getCurrentHotel } from '@/lib/hotel-context';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  // 1. Identificamos en qué hotel estamos trabajando
  const hotel = await getCurrentHotel();

  if (!hotel) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-slate-500 font-medium">
        No se encontró información del hotel para configurar.
      </div>
    );
  }

  // 🚨 PROTECCIÓN TURBOPACK: Instanciamos el cliente dentro del Server Component
  // Evitamos variables globales que ahoguen el compilador de Next.js 15
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  try {
    // 2. Extraemos toda la configuración actual y el equipo en paralelo (Mejora de rendimiento)
    const [hotelResponse, staffResponse] = await Promise.all([
      supabaseAdmin.from('hotels').select('*').eq('id', hotel.id).single(),
      supabaseAdmin.from('staff').select('*').eq('hotel_id', hotel.id).order('created_at', { ascending: false })
    ]);

    if (hotelResponse.error) throw hotelResponse.error;

    // 3. Renderizamos el panel blindado
    return (
      <div className="h-full">
        <SettingsPanel 
          initialData={hotelResponse.data || {}} 
          initialStaff={staffResponse.data || []} 
        />
      </div>
    );
  } catch (error) {
    console.error('Error cargando configuración:', error);
    return (
      <div className="flex items-center justify-center h-[80vh] text-red-500 font-medium">
        Error de conexión al cargar los ajustes. Por favor, recarga la página.
      </div>
    );
  }
}