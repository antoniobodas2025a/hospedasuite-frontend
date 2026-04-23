'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Users, LogIn, LogOut, BedDouble, AlertCircle, Sparkles, ArrowUpRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================
// BLOQUE 1: INTERFACES ESTRICTAS
// ==========================================

interface DashboardStats {
  occupancyRate: number;
  arrivalsToday: number;
  departuresToday: number;
  activeGuests: number;
  revenueToday: number;
  dirtyRooms: number;
}

interface DashboardKPIsProps {
  stats: DashboardStats;
}

interface DashboardKPIsViewProps {
  cards: KPICardData[];
  dirtyRooms: number;
}

interface KPICardData {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  glow: string;
}

// ==========================================
// BLOQUE 2: COMPONENTE PRESENTACIONAL (UI Claude 2026)
// ==========================================

const DashboardKPIsView: React.FC<DashboardKPIsViewProps> = ({ cards, dirtyRooms }) => {
  return (
    <div className='space-y-8 font-poppins'>
      
      {/* GRID ESTRATÉGICO: 4 Columnas Liquid Glass */}
      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6'>
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, type: 'spring', damping: 20 }}
            whileHover={{ y: -5 }}
            className='relative group cursor-default'
          >
            {/* Background Layer: Liquid Glass Deep */}
            <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-[2.5rem] ring-1 ring-inset ring-white/10 z-0 transition-all group-hover:bg-zinc-900/60" />
            
            {/* Glow Effect Layer */}
            <div className={cn(
              "absolute -right-10 -top-10 size-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 rounded-full z-0",
              card.glow
            )} />

            {/* Content Layer */}
            <div className='relative z-10 p-7 overflow-hidden'>
              <div className='flex justify-between items-start mb-6'>
                <div className={cn(
                  'p-3 rounded-2xl border transition-all duration-500 shadow-inner',
                  card.accent
                )}>
                  {card.icon}
                </div>
                <button className="text-zinc-600 hover:text-zinc-400 transition-colors">
                   <ArrowUpRight size={16} />
                </button>
              </div>

              <div className='space-y-1'>
                <p className='text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1'>
                  {card.title}
                </p>
                <h3 className='text-4xl font-bold text-zinc-50 tracking-tighter tabular-nums'>
                  {card.value}
                </h3>
                <div className='flex items-center gap-2 mt-2 px-3 py-1.5 bg-zinc-950/50 border border-white/5 rounded-full w-fit'>
                  <div className={cn("size-1.5 rounded-full animate-pulse", card.glow.replace('bg-', 'bg-').split(' ')[0])} />
                  <p className='text-[10px] font-bold text-zinc-400 uppercase tracking-widest'>
                    {card.sub}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ALERTAS OPERATIVAS (Misión Crítica) */}
      <AnimatePresence>
        {dirtyRooms > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className='relative overflow-hidden'
          >
            <div className="absolute inset-0 bg-rose-500/5 backdrop-blur-xl border border-rose-500/20 rounded-3xl z-0" />
            <div className='relative z-10 p-5 flex items-center justify-between gap-4'>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 shadow-[0_0_15px_-5px_rgba(244,63,94,0.4)]">
                  <AlertCircle size={20} />
                </div>
                <div className="space-y-0.5">
                  <p className='text-rose-200 font-bold text-sm tracking-tight'>Prioridad de Mantenimiento Requerida</p>
                  <p className='text-rose-500/70 text-xs font-medium'>
                    Hay <span className="text-rose-400 font-bold">{dirtyRooms} unidades</span> en estado post-check-out pendientes de sanitización inmediata.
                  </p>
                </div>
              </div>
              <button className="px-5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-rose-500/20 transition-all active:scale-95">
                Despachar Equipo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// BLOQUE 3: COMPONENTE CONTENEDOR (Máquina de Estados)
// ==========================================

export default function DashboardKPIs({ stats }: DashboardKPIsProps) {
  // 🛡️ Data Normalization (Zero-Trust)
  const revenue = stats.revenueToday ?? 0;
  const occupancy = stats.occupancyRate ?? 0;

  const cards: KPICardData[] = [
    {
      title: 'Ocupación Real',
      value: `${occupancy}%`,
      sub: `${stats.activeGuests} huéspedes en casa`,
      icon: <BedDouble size={22} strokeWidth={2.5} />,
      accent: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      glow: 'bg-indigo-500/20',
    },
    {
      title: 'Ingresos Hoy',
      value: `$${revenue.toLocaleString()}`,
      sub: 'Abonos registrados en ledger',
      icon: <TrendingUp size={22} strokeWidth={2.5} />,
      accent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      glow: 'bg-emerald-500/20',
    },
    {
      title: 'Llegadas Pendientes',
      value: stats.arrivalsToday ?? 0,
      sub: 'Vectores de entrada hoy',
      icon: <LogIn size={22} strokeWidth={2.5} />,
      accent: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      glow: 'bg-sky-500/20',
    },
    {
      title: 'Salidas Proyectadas',
      value: stats.departuresToday ?? 0,
      sub: 'Vectores de liberación',
      icon: <LogOut size={22} strokeWidth={2.5} />,
      accent: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      glow: 'bg-amber-500/20',
    },
  ];

  return <DashboardKPIsView cards={cards} dirtyRooms={stats.dirtyRooms ?? 0} />;
}