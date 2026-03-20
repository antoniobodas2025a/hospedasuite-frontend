import { createClient } from '@/utils/supabase/server';
import ReportsPanel from '@/components/dashboard/ReportsPanel';
import { getCurrentHotel } from '@/lib/hotel-context';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) return <div className='p-10 text-center font-bold text-slate-500'>No se encontró propiedad asociada.</div>;

  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`id, created_at, total_price, status, guests (full_name), rooms (name)`)
    .eq('hotel_id', hotel.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  const formattedSales = bookings?.map((b) => ({
      id: b.id,
      date: new Date(b.created_at).toISOString().split('T')[0],
      guest: b.guests?.full_name || 'Anónimo',
      room: b.rooms?.name || 'N/A',
      total: b.total_price,
      status: b.status === 'checked_out' ? 'Pagado' : 'Pendiente',
  })) || [];

  return (
    <div className='h-full'>
      <ReportsPanel sales={formattedSales} />
    </div>
  );
}