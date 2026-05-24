import { createClient } from '@/utils/supabase/server';
import ReportsPanel from '@/components/dashboard/ReportsPanel';
import { getCurrentHotel } from '@/lib/hotel-context';
import PlanGuard from '@/components/auth/PlanGuard';

export const dynamic = 'force-dynamic';

interface BookingSupabaseRow {
  id: string;
  created_at: string;
  total_price: number;
  status: string;
  guests: { full_name: string }[];
  rooms: { name: string }[];
}

export default async function ReportsPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) return <div className='p-10 text-center font-bold text-slate-500'>No se encontró propiedad asociada.</div>;

  return (
    <PlanGuard
      currentPlan={hotel.subscription_plan}
      subscriptionStatus={hotel.subscription_status}
      requiredPlan="enterprise"
      featureName="Reportes Financieros"
      featureDescription="Métricas avanzadas de revenue, exportación Excel y análisis de tendencias. Disponible en Plan Enterprise."
    >
      <ReportsContent hotel={hotel} />
    </PlanGuard>
  );
}

async function ReportsContent({ hotel }: { hotel: { id: string } }) {
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`id, created_at, total_price, status, guests (full_name), rooms (name)`)
    .eq('hotel_id', hotel.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  const raw = (bookings ?? []) as BookingSupabaseRow[];

  const formattedSales = raw.map((b) => ({
      id: b.id,
      date: new Date(b.created_at).toISOString().split('T')[0],
      guest: b.guests?.[0]?.full_name || 'Anónimo',
      room: b.rooms?.[0]?.name || 'N/A',
      total: b.total_price,
      status: b.status === 'checked_out' ? 'Pagado' : 'Pendiente',
  }));

  return (
    <div>
      <ReportsPanel sales={formattedSales} />
    </div>
  );
}
