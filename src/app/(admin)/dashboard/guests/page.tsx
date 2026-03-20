import { createClient } from '@/utils/supabase/server';
import GuestsPanel from '@/components/dashboard/GuestsPanel';
import { getCurrentHotel } from '@/lib/hotel-context';

export const dynamic = 'force-dynamic';

export default async function GuestsPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) return <div className='p-10 text-center font-bold text-slate-500'>No se encontró propiedad asociada.</div>;

  const supabase = await createClient();

  const { data: guests } = await supabase
    .from('guests')
    .select('*')
    .eq('hotel_id', hotel.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className='h-full'>
      {/* 👇 CORRECCIÓN: Pasamos el hotelId al panel */}
      <GuestsPanel initialGuests={guests || []} hotelId={hotel.id} />
    </div>
  );
}