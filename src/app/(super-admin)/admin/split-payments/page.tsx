import { CreditCard, TrendingUp, Building2 } from 'lucide-react';
import { getSplitPayments } from '@/data/superadmin';
import SplitPaymentsOverview from '@/components/super-admin/SplitPaymentsOverview';

export const dynamic = 'force-dynamic';

// ============================================================================
// Superadmin Split Payments Page — Server Component
//
// Fetches all split payments with hotel joins and calculates global KPIs.
// Passes data to the interactive SplitPaymentsOverview client component
// which handles filtering, CSV export, and table rendering.
// ============================================================================

export default async function SuperAdminSplitPaymentsPage() {
  const splitPayments = await getSplitPayments();

  // Calculate global KPIs
  const totalPlatformRevenue = splitPayments.reduce(
    (sum, p) => sum + Number(p.platform_amount),
    0
  );

  const totalProcessed = splitPayments.reduce(
    (sum, p) => sum + Number(p.total_amount),
    0
  );

  const activeHotels = new Set(splitPayments.map((p) => p.hotel_id)).size;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <CreditCard className="text-blue-500" />
            Split Payments — Vista Global
          </h2>
          <p className="text-white/50 text-sm">
            Todas las transacciones divididas entre hoteles y plataforma
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-[var(--radius-squircle-lg)] text-emerald-400 text-xs font-bold uppercase flex items-center gap-2">
            <TrendingUp size={14} />
            Ingresos Plataforma: ${totalPlatformRevenue.toLocaleString()}
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-[var(--radius-squircle-lg)] text-blue-400 text-xs font-bold uppercase flex items-center gap-2">
            <Building2 size={14} />
            Hoteles Activos: {activeHotels}
          </div>
        </div>
      </header>

      <SplitPaymentsOverview
        payments={splitPayments}
        totalPlatformRevenue={totalPlatformRevenue}
        totalProcessed={totalProcessed}
        activeHotels={activeHotels}
      />
    </div>
  );
}
