import { createClient } from '@/utils/supabase/server';
import CalendarPanel from '@/components/dashboard/CalendarPanel';
import { getCurrentHotel } from '@/lib/hotel-context';
import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) return <div className='p-10 text-center font-bold text-slate-500'>No se encontró propiedad asociada.</div>;

  const supabase = await createClient();

  // 1. Obtener Habitaciones
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, price, status')
    .eq('hotel_id', hotel.id)
    .order('name');

  // 🚨 SSR GUARD: Si no hay habitaciones, enviamos el EmptyState con iconName
  if (!rooms || rooms.length === 0) {
    return (
      <div className='h-[calc(100vh-8rem)] flex items-center justify-center p-4'>
        <EmptyState 
          iconName="calendar" 
          title="Tu calendario te espera" 
          description="Para poder visualizar y gestionar tus reservas, primero necesitas crear las habitaciones de tu hotel en el inventario."
          actionLabel="Ir al Inventario"
          actionHref="/dashboard/inventory"
          color="hospeda"
        />
      </div>
    );
  }

  // 2. Obtener Reservas (Solo si hay habitaciones)
  const today = new Date();
  const startFilter = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`id, room_id, check_in, check_out, status, guests (full_name)`)
    .eq('hotel_id', hotel.id)
    .gte('check_out', startFilter)
    .neq('status', 'cancelled');

  const formattedBookings = bookings?.map((b) => ({
      ...b,
      guest_name: b.guests?.full_name || 'Huésped',
  })) || [];

  return (
    <div className='h-full'>
      <CalendarPanel rooms={rooms} initialBookings={formattedBookings} hotelId={hotel.id} />
    </div>
  );
}