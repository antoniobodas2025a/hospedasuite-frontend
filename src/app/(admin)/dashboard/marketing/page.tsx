import { createClient } from '@/utils/supabase/server';
import CRMBoard from '@/components/dashboard/CRMBoard';
import { getCurrentHotel } from '@/lib/hotel-context';

export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) return <div className='p-10 text-center font-bold text-slate-500'>No se encontró propiedad asociada.</div>;

  const supabase = await createClient();

  const { data: leads } = await supabase
    .from('hunted_leads')
    .select('*')
    .eq('hotel_id', hotel.id)
    .order('created_at', { ascending: false });

  return (
    <div className='h-full'>
      <CRMBoard initialLeads={leads || []} />
    </div>
  );
}