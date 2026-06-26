import { createClient } from '@supabase/supabase-js';
import {
  Building2,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
  Activity,
  DollarSign,
  Server,
  Clock,
  Percent,
  AlertTriangle,
  Ban,
  ArrowRight,
  CreditCard,
  Users,
} from 'lucide-react';
import { getHQFinancialReportAction } from '@/app/actions/hq';
import { getSubscriptionMetricsAction } from '@/app/actions/super-admin';
import TenantManager from '@/components/super-admin/TenantManager';
import CreateHotelForm from '@/components/super-admin/CreateHotelForm';
import Link from 'next/link';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  const { data: hotels } = await supabaseAdmin.from('hotels').select('*').order('created_at', { ascending: false });
  const activeHotels = hotels?.filter((h: any) => h.status === 'active').length || 0;

  const hqResponse = await getHQFinancialReportAction();
  const kpis = hqResponse.success ? hqResponse.kpis : { globalSaaS: 0, globalCommissions: 0, grandTotalExpected: 0 };
  const hqData = hqResponse.success ? hqResponse.report : [];

  const metrics = await getSubscriptionMetricsAction();

  return (
    <div className='space-y-8 max-w-[1600px] mx-auto pb-20'>
      <header className='flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6'>
        <div>
          <h2 className='text-3xl font-bold text-white mb-1 flex items-center gap-2'><ShieldCheck className='text-blue-500' /> Centro de Comando</h2>
          <p className='text-white/50 text-sm'>Infraestructura de Propiedades & Facturación Global</p>
        </div>
        <div className='flex gap-4'>
          <div className='bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-[var(--radius-squircle-lg)] text-emerald-400 text-xs font-bold uppercase flex items-center gap-2'><TrendingUp size={14} /> A Facturar: ${kpis?.grandTotalExpected.toLocaleString()}</div>
          <div className='bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-[var(--radius-squircle-lg)] text-blue-400 text-xs font-bold uppercase flex items-center gap-2'><Building2 size={14} /> Activos: {activeHotels}</div>
        </div>
      </header>

      {/* ── Row 1: Financial KPIs ── */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className="bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]">
          <div className="p-3 bg-blue-500/10 text-blue-400 w-fit rounded-[var(--radius-squircle-2xl)] mb-4"><Server size={20} /></div>
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">MRR (Suscripciones Base)</p>
          <h3 className="text-3xl font-display font-bold text-white tracking-tight tabular-nums">${kpis?.globalSaaS.toLocaleString()}</h3>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]">
          <div className="p-3 bg-amber-500/10 text-amber-400 w-fit rounded-[var(--radius-squircle-2xl)] mb-4"><TrendingUp size={20} /></div>
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">Comisiones Channel</p>
          <h3 className="text-3xl font-display font-bold text-white tracking-tight tabular-nums">${kpis?.globalCommissions.toLocaleString()}</h3>
        </div>
        <div className="bg-emerald-900/40 border border-emerald-500/20 p-6 rounded-[var(--radius-squircle-2xl)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="p-3 bg-emerald-500/20 text-emerald-400 w-fit rounded-[var(--radius-squircle-2xl)] mb-4 relative z-10"><DollarSign size={20} /></div>
          <p className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-widest mb-1 relative z-10">Corte Mensual Esperado</p>
          <h3 className="text-4xl font-display font-bold text-emerald-400 tracking-tight tabular-nums relative z-10">${kpis?.grandTotalExpected.toLocaleString()}</h3>
        </div>
      </div>

      {/* ── Row 2: Subscription Health Metrics ── */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        {/* Trial Expiring Soon */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]">
          <div className="p-3 bg-amber-500/10 text-amber-400 w-fit rounded-[var(--radius-squircle-2xl)] mb-4"><Clock size={20} /></div>
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">Pruebas por Vencer</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-display font-bold text-white tracking-tight tabular-nums">{metrics.trialExpiringCount}</h3>
            <span className="text-xs text-white/40">próx. 7 días</span>
          </div>
        </div>

        {/* Churn Rate */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 w-fit rounded-[var(--radius-squircle-2xl)] mb-4"><Percent size={20} /></div>
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">Tasa de Churn</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-display font-bold text-white tracking-tight tabular-nums">{Math.round(metrics.churnRate * 100)}%</h3>
            <span className="text-xs text-white/40">últ. 30 días</span>
          </div>
        </div>

        {/* Past Due */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]">
          <div className="p-3 bg-rose-500/10 text-rose-400 w-fit rounded-[var(--radius-squircle-2xl)] mb-4"><AlertTriangle size={20} /></div>
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">Pagos Vencidos</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-display font-bold text-white tracking-tight tabular-nums">{metrics.pastDueCount}</h3>
            <span className="text-xs text-white/40">suscripciones</span>
          </div>
        </div>

        {/* Cancelled 30d */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]">
          <div className="p-3 bg-zinc-500/10 text-zinc-400 w-fit rounded-[var(--radius-squircle-2xl)] mb-4"><Ban size={20} /></div>
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">Canceladas</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-display font-bold text-white tracking-tight tabular-nums">{metrics.cancelledCount}</h3>
            <span className="text-xs text-white/40">últ. 30 días</span>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className='bg-white/5 border border-white/10 p-6 rounded-[var(--radius-squircle-2xl)]'>
        <h3 className='font-bold text-white mb-4 flex items-center gap-2 text-lg'><Activity className='text-blue-400' /> Acciones Rápidas</h3>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <Link
            href='/admin/subscriptions'
            className='flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-[var(--radius-squircle-lg)] p-4 transition-all group'
          >
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-blue-500/10 text-blue-400 rounded-[var(--radius-squircle-lg)]'>
                <CreditCard size={18} />
              </div>
              <div>
                <p className='text-sm font-bold text-white'>Suscripciones</p>
                <p className='text-xs text-white/40'>Gestionar planes y estados</p>
              </div>
            </div>
            <ArrowRight size={16} className='text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all' />
          </Link>
          <Link
            href='/admin/users'
            className='flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-[var(--radius-squircle-lg)] p-4 transition-all group'
          >
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-purple-500/10 text-purple-400 rounded-[var(--radius-squircle-lg)]'>
                <Users size={18} />
              </div>
              <div>
                <p className='text-sm font-bold text-white'>Usuarios</p>
                <p className='text-xs text-white/40'>Administrar roles y permisos</p>
              </div>
            </div>
            <ArrowRight size={16} className='text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all' />
          </Link>
        </div>
      </div>

      <div className='bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 p-8 rounded-[var(--radius-squircle-2xl)]'>
        <h3 className='font-bold text-white mb-6 flex items-center gap-2 text-lg'><PlusCircle className='text-emerald-400' /> Alta Rápida de Propiedad</h3>
        <CreateHotelForm />
        <p className='text-xs text-white/30 mt-4 ml-2'>* Genera usuario Auth + Registro en DB vinculados automáticamente.</p>
      </div>

      <div className='bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] overflow-hidden'>
        <div className='p-6 border-b border-white/10 flex justify-between items-center'>
          <h3 className='font-bold text-lg text-white'>Propiedades Registradas y Libro Mayor</h3>
          <span className='text-xs bg-white/10 px-2 py-1 rounded text-white/50'>Total: {hotels?.length || 0}</span>
        </div>
        <TenantManager hotels={hotels || []} hqData={hqData} />
      </div>
    </div>
  );
}
