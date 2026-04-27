import { createClient } from '@/utils/supabase/server';
import InventoryPanel from '@/components/dashboard/InventoryPanel';
import { getCurrentHotel } from '@/lib/hotel-context';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) redirect('/dashboard');

  const supabase = await createClient();

  // 🛡️ RECOLECCIÓN DE DATOS: Extracción determinista ordenada por nomenclatura
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('hotel_id', hotel.id)
    .order('name', { ascending: true });

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-10">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-3xl font-mono text-sm shadow-2xl">
          CRITICAL_ERROR: Falla de conexión con la matriz de inventario principal.
        </div>
      </div>
    );
  }

  return (
    <div className='h-full animate-in fade-in duration-700'>
      {/* 🛡️ INYECCIÓN DE CONTRATO: Enviamos initialRooms al cliente */}
      <InventoryPanel initialRooms={rooms || []} hotelId={hotel.id} />
    </div>
  );
}