import { createClient } from '@/utils/supabase/server';
import CRMBoard from '@/components/dashboard/CRMBoard';
import { getCurrentHotel } from '@/lib/hotel-context';
import PlanGuard from '@/components/auth/PlanGuard';
import { BarChart3 } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Marketing CRM</h1>
        <a
          href="/dashboard/marketing/dark-funnel"
          className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-xl text-sm font-medium hover:bg-purple-500/20 transition-colors"
        >
          <BarChart3 size={16} />
          Dark Funnel Analytics
        </a>
      </div>
      <CRMBoard initialLeads={leads || []} />
    </div>
  );
}
