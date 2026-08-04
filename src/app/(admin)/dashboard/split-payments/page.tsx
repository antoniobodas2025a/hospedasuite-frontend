import { getCurrentHotel } from '@/lib/hotel-context';
import { createClient } from '@/utils/supabase/server';
import SplitPaymentsKPIs from '@/components/dashboard/SplitPaymentsKPIs';
import SplitPaymentsTable from '@/components/dashboard/SplitPaymentsTable';
import { CreditCard } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SplitPaymentsPage() {
  const hotel = await getCurrentHotel();

  if (!hotel) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-muted-foreground font-medium">
        No tienes un hotel asociado.
      </div>
    );
  }

  const supabase = await createClient();

  // Obtener split payments del hotel
  const { data: splitPayments } = await supabase
    .from('split_payments')
    .select('id, hotel_id, booking_id, guest_name, total_amount, status, created_at')
    .eq('hotel_id', hotel.id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Calcular KPIs
  const totalReceived =
    splitPayments?.reduce((sum, p) => sum + Number(p.hotel_amount), 0) || 0;
  const totalCommissions =
    splitPayments?.reduce((sum, p) => sum + Number(p.platform_amount), 0) || 0;
  const pendingCount =
    splitPayments?.filter((p) => p.hotel_payout_status === 'PENDING').length || 0;

  return (
    <div className="space-y-[var(--space-breath)] max-w-7xl mx-auto pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-[var(--radius-squircle-xl)] bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <CreditCard size={22} className="text-brand-400 stroke-[1.5]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-sidebar-foreground">
              Split Payments
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Historial de pagos divididos entre tu hotel y HospedaSuite
            </p>
          </div>
        </div>
      </div>

      <SplitPaymentsKPIs
        totalReceived={totalReceived}
        totalCommissions={totalCommissions}
        pendingCount={pendingCount}
      />

      <SplitPaymentsTable payments={splitPayments || []} />
    </div>
  );
}
