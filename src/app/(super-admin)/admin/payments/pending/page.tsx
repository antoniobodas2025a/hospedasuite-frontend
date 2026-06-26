import { ShieldCheck, CreditCard } from 'lucide-react';
import { getPendingPayments } from '@/data/superadmin';
import PendingPaymentsTable from './PendingPaymentsTable';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function PendingPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) || 1 : 1;
  const status = typeof params.status === 'string' ? params.status : undefined;

  const { payments, total } = await getPendingPayments({
    status,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <CreditCard className="text-blue-500" /> Pagos Manuales
          </h2>
          <p className="text-white/50 text-sm">
            Revisión y aprobación de pagos vía Nequi / Daviplata
          </p>
        </div>

        <div className="flex gap-4">
          <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-[var(--radius-squircle-lg)] text-amber-400 text-xs font-bold uppercase flex items-center gap-2">
            <ShieldCheck size={14} />
            Total: {total}
          </div>
        </div>
      </header>

      {/* TABLA CON TABS (Client Component) */}
      <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] overflow-hidden">
        <PendingPaymentsTable
          payments={payments}
          totalPages={totalPages}
          currentPage={page}
          totalCount={total}
        />
      </div>
    </div>
  );
}
