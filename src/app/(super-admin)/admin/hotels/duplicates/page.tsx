import { createClient } from '@supabase/supabase-js';
import { ShieldCheck, Building2 } from 'lucide-react';
import DuplicatesTable from './DuplicatesTable';

// Cliente Admin para lectura (Bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = 'force-dynamic';

export default async function DuplicateHotelsPage() {
  const { data: hotels, error } = await supabaseAdmin
    .from('hotels')
    .select(`
      id,
      name,
      slug,
      city,
      location,
      created_at,
      subscription_status,
      hotel_fingerprints!inner(fingerprint_hash)
    `)
    .eq('subscription_status', 'duplicate_review')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching duplicate hotels:', error.message);
  }

  // Flatten the fingerprint join
  const flattened = (hotels || []).map((h: any) => ({
    id: h.id,
    name: h.name,
    slug: h.slug,
    city: h.city,
    location: h.location,
    created_at: h.created_at,
    subscription_status: h.subscription_status,
    fingerprint_hash: Array.isArray(h.hotel_fingerprints)
      ? h.hotel_fingerprints[0]?.fingerprint_hash ?? null
      : h.hotel_fingerprints?.fingerprint_hash ?? null,
  }));

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Building2 className="text-amber-500" /> Hoteles Duplicados
          </h2>
          <p className="text-white/50 text-sm">
            Revisión de activaciones gratuitas que coinciden con hoteles existentes
          </p>
        </div>

        <div className="flex gap-4">
          <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-[var(--radius-squircle-lg)] text-amber-400 text-xs font-bold uppercase flex items-center gap-2">
            <ShieldCheck size={14} />
            Pendientes: {flattened.length}
          </div>
        </div>
      </header>

      {/* TABLA */}
      <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] overflow-hidden">
        <DuplicatesTable
          hotels={flattened}
          error={error?.message}
        />
      </div>
    </div>
  );
}
