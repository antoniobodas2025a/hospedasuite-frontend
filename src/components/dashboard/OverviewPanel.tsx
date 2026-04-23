'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, Users, CalendarDays, TrendingUp, 
  ArrowRight, BedDouble, AlertCircle, Loader2, Rocket 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDashboardStats } from '@/app/actions/dashboard';
import { createClient } from '@/utils/supabase/client';
import EmptyState from '@/components/ui/EmptyState';

// ==========================================
// BLOQUE 2: TIPADO (Interfaces Estrictas)
// ==========================================

interface DashboardStats {
  totalRevenue: number;
  totalBookings: number;
  occupancyRate: number;
  chartData: Array<{ name: string; ingresos: number }>;
  upcomingArrivals: Array<{
    id: string;
    guests?: { full_name: string };
    rooms?: { name: string };
    check_in: string;
  }>;
}

interface OverviewPanelViewProps {
  stats: DashboardStats;
  isCompletelyEmpty: boolean;
}

interface OverviewPanelContainerProps {
  hotelId: string;
}

// ==========================================
// BLOQUE 3: COMPONENTE PRESENTACIONAL (UI Claude 2026)
// ==========================================

const OverviewPanelView: React.FC<OverviewPanelViewProps> = ({ stats, isCompletelyEmpty }) => {
  if (isCompletelyEmpty) {
    return (
      <EmptyState 
        icon={Rocket} 
        title="Terminal Inicializada" 
        description="El hotel está en línea, pero los vectores de datos están vacíos. Registre su primera reserva para comenzar el mapeo de métricas."
        actionLabel="Desplegar Calendario"
        actionHref="/dashboard/calendar"
        color="zinc" 
      />
    );
  }

  return (
    <div className='space-y-6 pb-20 font-poppins text-zinc-100'>
      
      {/* HEADER: Liquid Glass 2.0 */}
      <div className='flex justify-between items-center bg-zinc-900/40 backdrop-blur-2xl p-6 rounded-2xl border border-white/5 shadow-2xl shadow-black/50 ring-1 ring-inset ring-white/10'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight text-zinc-50'>Panel de Telemetría</h2>
          <p className='text-zinc-400 font-lora text-sm mt-1'>Rendimiento operativo y flujo financiero en tiempo real.</p>
        </div>
        <div className='px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg font-medium text-xs flex items-center gap-2 border border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]'>
          <TrendingUp className="size-4 stroke-[1.5]" /> Enlace Supabase Activo
        </div>
      </div>

      {/* MÉTRICAS CLAVE: Anti-Grid Layout */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        
        {/* Card: Ingresos */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease: [0.23, 1, 0.32, 1] }} 
          className='bg-zinc-900/80 rounded-2xl p-6 border border-zinc-800/60 shadow-xl relative overflow-hidden group'>
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-500"></div>
          <div className="relative z-10">
            <div className='flex items-center gap-3 mb-4'>
              <div className='size-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-indigo-400'>
                <DollarSign className="size-5 stroke-[1.5]" />
              </div>
              <h3 className='font-semibold text-zinc-400 text-xs tracking-widest uppercase'>Flujo del Mes</h3>
            </div>
            <p className='text-4xl font-bold text-zinc-50 flex items-baseline gap-1'>
              <span className='text-xl text-zinc-500'>$</span>
              {stats.totalRevenue.toLocaleString()}
            </p>
          </div>
        </motion.div>

        {/* Card: Ocupación */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ease: [0.23, 1, 0.32, 1] }} 
          className='bg-zinc-900/80 rounded-2xl p-6 border border-zinc-800/60 shadow-xl relative overflow-hidden group'>
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-500"></div>
          <div className="relative z-10">
            <div className='flex items-center gap-3 mb-4'>
              <div className='size-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-emerald-400'>
                <Users className="size-5 stroke-[1.5]" />
              </div>
              <h3 className='font-semibold text-zinc-400 text-xs tracking-widest uppercase'>Densidad Actual</h3>
            </div>
            <div className='flex items-end gap-3'>
              <p className='text-4xl font-bold text-zinc-50'>{stats.occupancyRate}%</p>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full mb-2.5 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${stats.occupancyRate}%` }}></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card: Reservas */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease: [0.23, 1, 0.32, 1] }} 
          className='bg-zinc-900/80 rounded-2xl p-6 border border-zinc-800/60 shadow-xl relative overflow-hidden group'>
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-colors duration-500"></div>
          <div className="relative z-10">
            <div className='flex items-center gap-3 mb-4'>
              <div className='size-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-sky-400'>
                <CalendarDays className="size-5 stroke-[1.5]" />
              </div>
              <h3 className='font-semibold text-zinc-400 text-xs tracking-widest uppercase'>Contratos Activos</h3>
            </div>
            <p className='text-4xl font-bold text-zinc-50'>{stats.totalBookings}</p>
          </div>
        </motion.div>

      </div>

      {/* SECCIÓN INFERIOR: Canvas Asimétrico */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        
        {/* Gráfico de Ingresos */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} 
          className='lg:col-span-2 bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800/60 shadow-xl backdrop-blur-sm'>
          <h3 className='text-sm font-semibold text-zinc-400 mb-6 uppercase tracking-wider'>Evolución de Ingresos (Mes en Curso)</h3>
          <div className='h-[300px] w-full'>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'inherit' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'inherit' }} tickFormatter={(value) => `$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`} />
                <Tooltip 
                  cursor={{ fill: '#27272a', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#09090b', borderRadius: '0.75rem', border: '1px solid #27272a', color: '#f4f4f5', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                />
                <Bar dataKey="ingresos" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Próximas Llegadas */}
        <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} 
          className='bg-[#0F0F0F] rounded-2xl p-8 border border-zinc-800/80 shadow-2xl relative overflow-hidden flex flex-col'>
          <div className="absolute top-0 right-0 w-40 h-40 bg-zinc-800/20 rounded-full blur-3xl z-0"></div>
          
          <h3 className='text-sm font-semibold text-zinc-400 mb-6 relative z-10 flex items-center justify-between uppercase tracking-wider'>
            Llegadas Inminentes
            <span className='text-[10px] font-bold bg-zinc-800 px-2.5 py-1 rounded-md text-zinc-300'>TOP 5</span>
          </h3>

          <div className='flex-1 space-y-3 relative z-10'>
            {stats.upcomingArrivals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-3">
                <BedDouble className="size-8 stroke-[1]" />
                <p className="font-lora italic text-sm">Sin vectores de llegada próximos.</p>
              </div>
            ) : (
              stats.upcomingArrivals.map((booking) => (
                <div key={booking.id} 
                  className='bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3.5 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all duration-300 flex items-center justify-between group cursor-default'>
                  <div>
                    <p className='font-medium text-sm text-zinc-200 group-hover:text-white transition-colors'>{booking.guests?.full_name}</p>
                    <p className='text-xs text-zinc-500 mt-1 flex items-center gap-1.5'>
                      <BedDouble className="size-3" /> {booking.rooms?.name}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-xs font-mono text-zinc-400 group-hover:text-indigo-400 transition-colors'>{booking.check_in.split('-').reverse().join('/')}</p>
                    <ArrowRight className='size-3.5 text-zinc-600 inline-block mt-1 group-hover:translate-x-1 transition-transform' />
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
};

// ==========================================
// BLOQUE 4: COMPONENTE CONTENEDOR (Lógica)
// ==========================================

export default function OverviewPanel({ hotelId }: OverviewPanelContainerProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Patrón isMounted mitigador de Memory Leaks en React Concurrente
    let isMounted = true;

    async function loadStats() {
      if (!hotelId) return;
      try {
        const response = await getDashboardStats(hotelId);
        
        if (!isMounted) return;

        if (response.success) {
          setStats(response.data);
        } else {
          setError(response.error || 'Fallo en la resolución de métricas.');
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(`Pérdida de enlace con el servidor central: ${errorMessage}`);
      } finally {
        if (isMounted) setIsLoading(false); 
      }
    }

    loadStats();

    // Lógica intocable: Suscripción Realtime a Supabase
    const supabase = createClient();
    const channel = supabase
      .channel(`dashboard-sync-${hotelId}`)
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'bookings',
          filter: `hotel_id=eq.${hotelId}`,
        },
        () => {
          // Re-fetch silencioso al detectar mutación en DB
          loadStats();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [hotelId]);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-500 gap-4 bg-[#09090b]">
        <Loader2 className="size-8 animate-spin text-zinc-400 stroke-[1.5]" />
        <p className="font-mono text-xs tracking-widest uppercase animate-pulse">Sincronizando telemetría...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-red-400/80 gap-4 bg-[#09090b]">
        <AlertCircle className="size-10 stroke-[1.5]" />
        <p className="font-mono text-sm uppercase tracking-wider">{error || 'Error crítico de estado'}</p>
        <button onClick={() => window.location.reload()} 
          className="mt-2 px-6 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md font-mono text-xs uppercase hover:bg-red-500/20 transition-colors">
          Reiniciar Conexión
        </button>
      </div>
    );
  }

  const isCompletelyEmpty = stats.totalRevenue === 0 && stats.totalBookings === 0 && stats.upcomingArrivals.length === 0;

  // Delegación pura al componente Presentacional
  return <OverviewPanelView stats={stats} isCompletelyEmpty={isCompletelyEmpty} />;
}