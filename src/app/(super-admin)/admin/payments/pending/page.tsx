import { createClient } from '@supabase/supabase-js';
import { ShieldCheck, CreditCard } from 'lucide-react';
import PendingPaymentsTable from './PendingPaymentsTable';

// Cliente Admin para lectura (Bypass RLS) — mismo patrón que /admin/page.tsx
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = 'force-dynamic';

export default async function PendingPaymentsPage() {
  // Fetch manual_payments con hotel join — todas las solicitudes
  const { data: payments, error } = await supabaseAdmin
    .from('manual_payments')
    .select(`
      id,
      hotel_id,
      user_id,
      amount,
      method,
      status,
      receipt_url,
      rejection_reason,
      created_at,
      approved_at,
      approved_by,
      hotels!inner(name, city, email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching manual payments:', error.message);
  }

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
            Pendientes:{' '}
            {payments?.filter((p) => p.status === 'pending').length ?? 0}
          </div>
        </div>
      </header>

      {/* TABLA CON TABS (Client Component) */}
      <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] overflow-hidden">
        <PendingPaymentsTable
          payments={
            (payments || []).map((p) => ({
              ...p,
              hotels: Array.isArray(p.hotels) ? p.hotels[0] ?? null : p.hotels,
            }))
          }
          error={error?.message}
        />
      </div>
    </div>
  );
}
