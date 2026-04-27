import { createClient } from '@/utils/supabase/server';
import { getCurrentHotel } from '@/lib/hotel-context';
import { redirect } from 'next/navigation';
// 🛡️ CORRECCIÓN TOPOLÓGICA: Apuntando al directorio de componentes centralizados
import HousekeepingPanel from '@/components/dashboard/HousekeepingPanel';

export const dynamic = 'force-dynamic';

export default async function HousekeepingPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) redirect('/dashboard');

  const supabase = await createClient();

  // 🛡️ RECOLECCIÓN DE DATOS DE INVENTARIO
  // Traemos todas las habitaciones para tener una visión total del estado del hotel.
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('hotel_id', hotel.id)
    .order('name', { ascending: true });

  if (error) {
    return (
      <div className="p-10 text-rose-500 font-mono bg-rose-500/10 border border-rose-500/20 rounded-3xl text-center">
        CRITICAL_FETCH_ERROR: Fallo en el sensor de inventario de habitaciones.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-zinc-50">Logística de Unidades</h1>
          <p className="text-zinc-400 text-sm mt-1">Gestión física de inventario y estados de limpieza.</p>
        </div>
      </div>

      {/* Hand-off al componente interactivo del cliente con el prop correcto */}
      <HousekeepingPanel rooms={rooms || []} />
    </div>
  );
}