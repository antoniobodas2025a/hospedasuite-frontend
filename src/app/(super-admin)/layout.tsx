import React from 'react';
import '../globals.css';
import Link from 'next/link';
import { ShieldCheck, LayoutDashboard, CreditCard, Building2, Users } from 'lucide-react';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='min-h-screen bg-[#09090b] relative overflow-hidden font-sans antialiased text-white selection:bg-blue-500/30'>
      {/* --- Ambient Background --- */}
      <div className='fixed inset-0 z-0 bg-[#09090b]' />
      <div className='fixed top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px] opacity-60 animate-pulse' />
      <div className='fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[100px] opacity-60' />

      {/* --- Noise Overlay --- */}
      <div
        className='fixed inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      ></div>

      <div className='relative z-10 flex flex-col md:flex-row h-screen'>
        {/* Sidebar estático para Super Admin */}
        <aside className='w-full md:w-20 lg:w-72 border-r border-white/10 glass-panel p-6 flex flex-col'>
          <div className='flex items-center gap-3 mb-10'>
            <div className='w-10 h-10 rounded-[var(--radius-squircle-lg)] bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-900/20'>
              <ShieldCheck
                size={20}
                className='text-white'
              />
            </div>
            <h1 className='text-xl font-bold tracking-tight hidden lg:block'>
              Admin <span className='text-blue-400'>OS</span>
            </h1>
          </div>
          {/* Navegación Super Admin */}
          <nav className='flex flex-col gap-1 mt-4'>
            <Link
              href='/admin'
              className='flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-squircle-lg)] text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-medium'
            >
              <LayoutDashboard size={18} />
              <span className='hidden lg:inline'>Centro de Comando</span>
            </Link>
            <Link
              href='/admin/payments/pending'
              className='flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-squircle-lg)] text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-medium'
            >
              <CreditCard size={18} />
              <span className='hidden lg:inline'>Pagos Pendientes</span>
            </Link>
            <Link
              href='/admin/hotels/duplicates'
              className='flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-squircle-lg)] text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-medium'
            >
              <Building2 size={18} />
              <span className='hidden lg:inline'>Hoteles Duplicados</span>
            </Link>
            <Link
              href='/admin/leads'
              className='flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-squircle-lg)] text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-medium'
            >
              <Users size={18} />
              <span className='hidden lg:inline'>Leads</span>
            </Link>
          </nav>
          <div className='mt-auto text-xs text-white/30 hidden lg:block'>
            v28.0 SuperUser
          </div>
        </aside>

        {/* Contenido Principal */}
        <main className='flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8'>
          {children}
        </main>
      </div>
    </div>
  );
}
