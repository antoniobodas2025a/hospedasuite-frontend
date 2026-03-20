import { createClient } from '@/utils/supabase/server';
import ForensicBookPanel from '@/components/dashboard/ForensicBookPanel';
import { getCurrentHotel } from '@/lib/hotel-context';

export const dynamic = 'force-dynamic';

export default async function ForensicBookPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) return <div className='p-10 text-center font-bold text-slate-500'>No se encontró propiedad asociada.</div>;

  const supabase = await createClient();

  const { data: entries, error } = await supabase
    .from('bookings')
    .select(`*, guests (full_name, doc_number, country), rooms (name, type)`)
    .eq('hotel_id', hotel.id)
    .order('created_at', { ascending: false });

  if (error) console.error('Error fetching forensic book:', error);

  return (
    <div className='h-full'>
      <ForensicBookPanel initialData={entries || []} />
    </div>
  );
}