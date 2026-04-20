import { createClient } from '@supabase/supabase-js';
import { Building2, PlusCircle, ShieldCheck, TrendingUp, Activity, DollarSign, Server } from 'lucide-react';
import { createHotelAction } from '@/app/actions/super-admin';
import { getHQFinancialReportAction } from '@/app/actions/hq';
import TenantManager from '@/components/super-admin/TenantManager';

// Cliente Admin para lectura (Bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  // 1. Extraer Hoteles y Leads (Su código original)
  const { data: hotels } = await supabaseAdmin
    .from('hotels')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: leads } = await supabaseAdmin
    .from('platform_leads')
    .select('id')
    .eq('status', 'pending');

  const activeHotels = hotels?.filter((h) => h.status === 'active').length || 0;

  // 2. 🚀 INYECCIÓN DEL MÓDULO HQ (Cálculo Forense de Comisiones y MRR)
  const hqResponse = await getHQFinancialReportAction();
  const kpis = hqResponse.success ? hqResponse.kpis : { globalSaaS: 0, globalCommissions: 0, grandTotalExpected: 0 };
  const hqData = hqResponse.success ? hqResponse.report : [];

  return (
    <div className='space-y-8 max-w-[1600px] mx-auto pb-20'>
      
      {/* HEADER */}
      <header className='flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6'>
        <div>
          <h2 className='text-3xl font-bold text-white mb-1 flex items-center gap-2'>
            <ShieldCheck className='text-blue-500' /> Centro de Comando
          </h2>
          <p className='text-white/50 text-sm'>
            Infraestructura Multi-Tenant & Facturación Global
          </p>
        </div>

        <div className='flex gap-4'>
          <div className='bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-emerald-400 text-xs font-bold uppercase flex items-center gap-2'>
            <TrendingUp size={14} /> A Facturar: ${kpis?.grandTotalExpected.toLocaleString()}
          </div>
          <div className='bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-blue-400 text-xs font-bold uppercase flex items-center gap-2'>
            <Building2 size={14} /> Activos: {activeHotels}
          </div>
        </div>
      </header>

      {/* 🚀 NUEVO: MÓDULO FINANCIERO HQ (LEGO INYECTADO) */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
          <div className="p-3 bg-blue-500/10 text-blue-400 w-fit rounded-2xl mb-4"><Server size={20} /></div>
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">MRR (Suscripciones Base)</p>
          <h3 className="text-3xl font-display font-bold text-white tracking-tight tabular-nums">${kpis?.globalSaaS.toLocaleString()}</h3>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
          <div className="p-3 bg-amber-500/10 text-amber-400 w-fit rounded-2xl mb-4"><TrendingUp size={20} /></div>
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">Comisiones (OTA+Upsell)</p>
          <h3 className="text-3xl font-display font-bold text-white tracking-tight tabular-nums">${kpis?.globalCommissions.toLocaleString()}</h3>
        </div>
        <div className="bg-emerald-900/40 border border-emerald-500/20 p-6 rounded-[2rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="p-3 bg-emerald-500/20 text-emerald-400 w-fit rounded-2xl mb-4 relative z-10"><DollarSign size={20} /></div>
          <p className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-widest mb-1 relative z-10">Corte Mensual Esperado</p>
          <h3 className="text-4xl font-display font-bold text-emerald-400 tracking-tight tabular-nums relative z-10">${kpis?.grandTotalExpected.toLocaleString()}</h3>
        </div>
      </div>

      {/* --- SECCIÓN 1: ALTA RÁPIDA --- */}
      <div className='bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 p-8 rounded-[2rem]'>
        <h3 className='font-bold text-white mb-6 flex items-center gap-2 text-lg'>
          <PlusCircle className='text-emerald-400' /> Alta Rápida de Propiedad
        </h3>

        <form action={createHotelAction} className='grid grid-cols-1 md:grid-cols-5 gap-4 items-end'>
          <div className='space-y-2'>
            <label className='text-xs font-bold text-white/50 uppercase ml-2'>Hotel</label>
            <input name='name' required placeholder='Ej: Hotel Alpha' className='w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-emerald-500/50' />
          </div>

          <div className='space-y-2'>
            <label className='text-xs font-bold text-white/50 uppercase ml-2'>Email Dueño</label>
            <input name='email' type='email' required placeholder='admin@hotel.com' className='w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-emerald-500/50' />
          </div>

          <div className='space-y-2'>
            <label className='text-xs font-bold text-white/50 uppercase ml-2'>Contraseña</label>
            <input name='password' type='text' required placeholder='Clave segura...' className='w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-emerald-500/50' />
          </div>

          {/* 🛡️ CORRECCIÓN DE PLANES: Sincronizados con HQ.ts */}
          <div className='space-y-2'>
            <label className='text-xs font-bold text-white/50 uppercase ml-2'>Plan (SaaS Bundling)</label>
            <select name='plan' className='w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-emerald-500/50 cursor-pointer'>
              <option value='micro' className='text-black'>Micro (59.9k)</option>
              <option value='standard' className='text-black'>Estándar (99.9k)</option>
              <option value='pro' className='text-black'>Pro (189.9k)</option>
            </select>
          </div>

          <button type='submit' className='w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex justify-center items-center gap-2'>
            <Activity size={18} /> Crear Tenant
          </button>
        </form>
        
        <p className='text-xs text-white/30 mt-4 ml-2'>
          * Genera usuario Auth + Registro en DB vinculados automáticamente. El plan incluye Channel Manager.
        </p>
      </div>

      {/* --- SECCIÓN 2: GESTOR DE TENANTS --- */}
      <div className='bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden'>
        <div className='p-6 border-b border-white/10 flex justify-between items-center'>
          <h3 className='font-bold text-lg text-white'>Propiedades Registradas y Libro Mayor</h3>
          <span className='text-xs bg-white/10 px-2 py-1 rounded text-white/50'>Total: {hotels?.length || 0}</span>
        </div>
        
        {/* Pasamos también la data del HQ al TenantManager para mostrar la deuda en la tabla si lo desea */}
        <TenantManager hotels={hotels || []} hqData={hqData} />
      </div>
      
    </div>
  );
}