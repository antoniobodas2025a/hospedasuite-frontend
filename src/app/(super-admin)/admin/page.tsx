import { createClient } from '@supabase/supabase-js';
import { Building2, PlusCircle, ShieldCheck, TrendingUp, Activity } from 'lucide-react';
import { createHotelAction } from '@/app/actions/super-admin';
import TenantManager from '@/components/super-admin/TenantManager';

// Cliente Admin para lectura (Bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  const { data: hotels } = await supabaseAdmin
    .from('hotels')
    .select('*')
    .order('created_at', { ascending: false });

  // 🚨 FIX QA: Restaurada la consulta de Leads ("Código Comido")
  const { data: leads } = await supabaseAdmin
    .from('platform_leads')
    .select('id')
    .eq('status', 'pending');

  const activeHotels = hotels?.filter((h) => h.status === 'active').length || 0;
  const mrr = hotels?.reduce((acc, h) => acc + (h.monthly_price || 0), 0) || 0;

  return (
    <div className='space-y-8 max-w-[1600px] mx-auto pb-20'>
      
      {/* HEADER */}
      <header className='flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6'>
        <div>
          <h2 className='text-3xl font-bold text-white mb-1 flex items-center gap-2'>
            <ShieldCheck className='text-blue-500' /> Centro de Comando
          </h2>
          <p className='text-white/50 text-sm'>
            Infraestructura Multi-Tenant (Grado Producción)
          </p>
        </div>

        <div className='flex gap-4'>
          <div className='bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-emerald-400 text-xs font-bold uppercase flex items-center gap-2'>
            <TrendingUp size={14} /> MRR Estimado: ${mrr.toLocaleString()}
          </div>
          <div className='bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-blue-400 text-xs font-bold uppercase flex items-center gap-2'>
            <Building2 size={14} /> Activos: {activeHotels}
          </div>
        </div>
      </header>

      {/* --- SECCIÓN 1: ALTA RÁPIDA (CORREGIDA) --- */}
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

          <div className='space-y-2'>
            <label className='text-xs font-bold text-white/50 uppercase ml-2'>Plan</label>
            <select name='plan' className='w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-emerald-500/50 cursor-pointer'>
              <option value='PRO_AI' className='text-black'>PRO AI</option>
              <option value='GROWTH' className='text-black'>GROWTH</option>
              <option value='CORPORATE' className='text-black'>CORPORATE</option>
            </select>
          </div>

          {/* 🚨 FIX QA: Restaurado el ícono de Activity ("Código Comido") */}
          <button type='submit' className='w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex justify-center items-center gap-2'>
            <Activity size={18} /> Crear Tenant
          </button>
        </form>
        
        {/* 🚨 FIX QA: Restaurado el texto de ayuda ("Código Comido") */}
        <p className='text-xs text-white/30 mt-4 ml-2'>
          * Genera usuario Auth + Registro en DB vinculados automáticamente.
        </p>
      </div>

      {/* --- SECCIÓN 2: GESTOR DE TENANTS (CLIENT COMPONENT) --- */}
      <div className='bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden'>
        <div className='p-6 border-b border-white/10 flex justify-between items-center'>
          <h3 className='font-bold text-lg text-white'>Propiedades Registradas</h3>
          <span className='text-xs bg-white/10 px-2 py-1 rounded text-white/50'>Total: {hotels?.length || 0}</span>
        </div>
        
        <TenantManager hotels={hotels || []} />
      </div>
      
    </div>
  );
}