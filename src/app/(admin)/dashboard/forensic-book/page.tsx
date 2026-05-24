import { createClient } from '@/utils/supabase/server';
import ForensicBookPanel from '@/components/dashboard/ForensicBookPanel';
import { getCurrentHotel } from '@/lib/hotel-context';
import PlanGuard from '@/components/auth/PlanGuard';

export const dynamic = 'force-dynamic';

export default async function ForensicBookPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) return <div className='p-10 text-center font-bold text-slate-500'>No se encontró propiedad asociada.</div>;

  return (
    <PlanGuard
      currentPlan={hotel.subscription_plan}
      subscriptionStatus={hotel.subscription_status}
      requiredPlan="pro"
      featureName="Libro Registro"
      featureDescription="Auditoría histórica de reservas y huéspedes. Disponible desde el Plan Pro."
    >
      <ForensicBookContent hotel={hotel} />
    </PlanGuard>
  );
}

async function ForensicBookContent({ hotel }: { hotel: { id: string } }) {
  const supabase = await createClient();

  const { data: entries, error } = await supabase
    .from('bookings')
    .select(`*, guests (full_name, doc_number, country), rooms (name, type)`)
    .eq('hotel_id', hotel.id)
    .order('created_at', { ascending: false });

  if (error) console.error('Error fetching forensic book:', error);

  return (
    <div>
      <ForensicBookPanel initialData={entries || []} />
    </div>
  );
}
