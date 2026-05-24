import { createClient } from '@/utils/supabase/server';
import POSPanel from '@/components/dashboard/POSPanel';
import { getCurrentHotel } from '@/lib/hotel-context';
import EmptyState from '@/components/ui/EmptyState';
import PlanGuard from '@/components/auth/PlanGuard';
import { getHotelMenuItems, getHotelCategories } from '@/data/carta-digital';

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

  return (
    <PlanGuard
      currentPlan={hotel.subscription_plan}
      subscriptionStatus={hotel.subscription_status}
      requiredPlan="pro"
      featureName="Carta Digital (POS)"
      featureDescription="Punto de venta para cargar consumos a habitaciones. Disponible desde el Plan Pro."
    >
      <POSPageContent hotel={hotel} />
    </PlanGuard>
  );
}

async function POSPageContent({ hotel }: { hotel: { id: string } }) {
  const supabase = await createClient();

  // 1. Obtener Habitaciones Activas
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, status')
    .eq('hotel_id', hotel.id)
    .order('name');

  if (!rooms || rooms.length === 0) {
    return (
      <div className='h-[calc(100vh-8rem)] flex items-center justify-center p-4'>
        <EmptyState 
          iconName="alert" 
          title="Faltan Habitaciones" 
          description="Para poder usar el Punto de Venta y cargar consumos, primero debes configurar las habitaciones de tu propiedad."
          actionLabel="Ir al Inventario"
          actionHref="/dashboard/inventory"
          color="warm"
        />
      </div>
    );
  }

  // 2. Obtener Productos del Menú (unified DAL)
  const [initialItems, categories] = await Promise.all([
    getHotelMenuItems(hotel.id),
    getHotelCategories(hotel.id),
  ]);

  return (
    <div>
      <POSPanel 
        initialItems={initialItems || []} 
        rooms={rooms || []} 
        hotelId={hotel.id}
        categories={categories || []}
      />
    </div>
  );
}
