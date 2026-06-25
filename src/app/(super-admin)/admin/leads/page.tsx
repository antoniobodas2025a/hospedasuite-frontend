import { createClient } from '@supabase/supabase-js';
import { Users, AlertCircle, Database } from 'lucide-react';

// Admin client for read-only queries (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = 'force-dynamic';

interface Lead {
  id: number;
  created_at: string;
  business_name: string;
  phone: string;
  city_search: string;
  status: string;
  notes: string;
}

export default async function LeadsPage() {
  const { data: leads, error } = await supabaseAdmin
    .from('hunted_leads')
    .select('id, created_at, business_name, phone, city_search, status, notes')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
        <header className="flex flex-col gap-2 border-b border-white/10 pb-6">
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Users className="text-blue-500" /> Leads
          </h2>
          <p className="text-white/50 text-sm">
            Vista global de todos los leads capturados
          </p>
        </header>
        <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] p-12 text-center">
          <AlertCircle className="mx-auto text-rose-500 size-12 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Error al cargar leads</h3>
          <p className="text-zinc-400 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
        <header className="flex flex-col gap-2 border-b border-white/10 pb-6">
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Users className="text-blue-500" /> Leads
          </h2>
          <p className="text-white/50 text-sm">
            Vista global de todos los leads capturados
          </p>
        </header>
        <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] p-12 text-center">
          <Database className="mx-auto text-zinc-600 size-12 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No hay leads aún</h3>
          <p className="text-zinc-400 text-sm">
            Cuando los visitantes completen el formulario de captura, aparecerán aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Users className="text-blue-500" /> Leads
          </h2>
          <p className="text-white/50 text-sm">
            Vista global de todos los leads capturados — solo lectura
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-[var(--radius-squircle-lg)] text-blue-400 text-xs font-bold uppercase flex items-center gap-2">
          <Users size={14} />
          Total: {leads.length}
        </div>
      </header>

      {/* TABLE */}
      <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Negocio
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Teléfono
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Ciudad
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Estado
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Notas
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Creado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {leads.map((lead: Lead) => (
              <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">
                  {lead.business_name || '—'}
                </td>
                <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                  {lead.phone || '—'}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {lead.city_search || '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      lead.status === 'activo'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : lead.status === 'waitlist_silenciosa'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                    }`}
                  >
                    {lead.status || 'new'}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs max-w-[300px] truncate">
                  {lead.notes || '—'}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                  {lead.created_at
                    ? new Date(lead.created_at).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
