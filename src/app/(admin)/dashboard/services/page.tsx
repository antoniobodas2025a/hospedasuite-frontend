import { createClient } from '@/utils/supabase/server';
import POSPanel from '@/components/dashboard/POSPanel';
import { getCurrentHotel } from '@/lib/hotel-context';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) return <div className='p-10 text-center font-bold text-slate-500'>No se encontró propiedad asociada.</div>;

  const supabase = await createClient();

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*')
    .eq('hotel_id', hotel.id)
    .order('category', { ascending: true });

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('hotel_id', hotel.id)
    .order('name');

  return (
    <div className='h-full'>
      <POSPanel initialItems={menuItems || []} rooms={rooms || []} hotelId={hotel.id} />
    </div>
  );
}