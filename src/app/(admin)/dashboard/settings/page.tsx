import SettingsPanel from '@/components/dashboard/SettingsPanel';
import AlegraConfigPanel from '@/components/dashboard/AlegraConfigPanel';
import { getCurrentHotel } from '@/lib/hotel-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

  try {
    // 2. Extraemos toda la configuración actual y el equipo en paralelo (Mejora de rendimiento)
    const [hotelResponse, staffResponse, locationResponse] = await Promise.all([
      supabaseAdmin.from('hotels').select('id, name, slug, subscription_plan, subscription_status, trial_ends_at, owner_id, email, phone, city, location, address, settings, wompi_public_key, wompi_integrity_secret, created_at').eq('id', hotel.id).single(),
      supabaseAdmin.from('staff').select('id, hotel_id, user_id, name, role, pin_code, created_at').eq('hotel_id', hotel.id).order('created_at', { ascending: false }),
      supabaseAdmin.from('hotel_locations').select('lat, lng, precision').eq('hotel_id', hotel.id).order('created_at', { ascending: false }).limit(1)
    ]);

    if (hotelResponse.error) throw hotelResponse.error;

    // Merge coordinates into initialData so MapPicker can initialize
    const rawLocation = locationResponse.data?.[0] as unknown as { lat: number; lng: number; precision: string } | null;
    const initialData = {
      ...(hotelResponse.data || {}),
      latitude: rawLocation?.lat ?? null,
      longitude: rawLocation?.lng ?? null,
    };

    // 3. Renderizamos el panel blindado
    return (
      <div className="w-full space-y-6">
        <SettingsPanel 
          initialData={initialData} 
          initialStaff={staffResponse.data || []} 
        />
        
        {/* Conector de Facturación Electrónica (Alegra) */}
        <AlegraConfigPanel 
          hotelId={hotel.id}
          initialEmail={hotelResponse.data?.alegra_email || undefined}
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