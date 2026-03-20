import { createClient } from '@/utils/supabase/server';
import POSPanel from '@/components/dashboard/POSPanel';
import { getCurrentHotel } from '@/lib/hotel-context';
import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export default async function POSPage() {
  const hotel = await getCurrentHotel();
  
  if (!hotel) {
    return (
      <div className='p-10 text-center font-bold text-slate-500'>
        No se encontró propiedad asociada.
      </div>
    );
  }

  const supabase = await createClient();

  // 1. Obtener Habitaciones Activas (Para poder cargar las ventas a una cuenta)
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, status')
    .eq('hotel_id', hotel.id)
    .order('name');

  // 🚨 SSR GUARD: Si el hotel no tiene habitaciones creadas, el POS no puede operar
  // porque el botón de Confirmar Venta exige una habitación.
  if (!rooms || rooms.length === 0) {
    return (
      <div className='h-[calc(100vh-8rem)] flex items-center justify-center p-4'>
        <EmptyState 
          iconName="alert" 
          title="Faltan Habitaciones" 
          description="Para poder usar el Punto de Venta y cargar consumos, primero debes configurar las habitaciones de tu propiedad."
          actionLabel="Ir al Inventario"
          actionHref="/dashboard/inventory"
          color="orange"
        />
      </div>
    );
  }

  // 2. Obtener los Productos del Menú (Catálogo Inicial)
  // Nota: Si tu tabla en Supabase se llama diferente (ej: 'pos_products'), cámbialo aquí.
  const { data: initialItems } = await supabase
    .from('menu_items') 
    .select('*')
    .eq('hotel_id', hotel.id)
    .order('name');

  return (
    <div className='h-full'>
      <POSPanel 
        initialItems={initialItems || []} 
        rooms={rooms || []} 
        hotelId={hotel.id} 
      />
    </div>
  );
}