import { createClient } from '@/utils/supabase/server';
import InventoryPanel from '@/components/dashboard/InventoryPanel';
import { getCurrentHotel } from '@/lib/hotel-context';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) return <div className='p-10 text-center font-bold text-slate-500'>No se encontró propiedad asociada.</div>;

  const supabase = await createClient();

  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .eq('hotel_id', hotel.id)
    .order('name');

  return (
    <div className='h-full'>
      <InventoryPanel initialRooms={rooms || []} hotelId={hotel.id} />
    </div>
  );
}