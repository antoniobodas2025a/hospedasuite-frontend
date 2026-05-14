import { createClient } from '@/utils/supabase/server';
import CRMBoard from '@/components/dashboard/CRMBoard';
import { getCurrentHotel } from '@/lib/hotel-context';
import PlanGuard from '@/components/auth/PlanGuard';

export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) return <div className='p-10 text-center font-bold text-slate-500'>No se encontró propiedad asociada.</div>;

  return (
    <PlanGuard
      currentPlan={hotel.subscription_plan}
      subscriptionStatus={hotel.subscription_status}
      requiredPlan="enterprise"
      featureName="Marketing CRM"
      featureDescription="Pipeline de ventas corporativas y gestión de leads B2B. Disponible en Plan Enterprise."
    >
      <MarketingContent hotel={hotel} />
    </PlanGuard>
  );
}

async function MarketingContent({ hotel }: { hotel: { id: string } }) {
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
