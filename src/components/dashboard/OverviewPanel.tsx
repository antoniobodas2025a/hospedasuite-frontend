'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Users, CalendarDays, TrendingUp, ArrowRight, BedDouble, AlertCircle, Loader2, Rocket } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDashboardStats } from '@/app/actions/dashboard';
import { createClient } from '@/utils/supabase/client';
import EmptyState from '@/components/ui/EmptyState'; // 🚨 IMPORTAMOS EL EMPTY STATE

interface OverviewPanelProps {
  hotelId: string;
}

export default function OverviewPanel({ hotelId }: OverviewPanelProps) {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!hotelId) return;
      try {
        const response = await getDashboardStats(hotelId);
        if (response.success) {
          setStats(response.data);
        } else {
          setError(response.error || 'Error desconocido al cargar estadísticas');
        }
      } catch (err: any) {
        setError('Error de conexión con el servidor.');
      } finally {
        setIsLoading(false); 
      }
    }

    loadStats();

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
        () => loadStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotelId]);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-4">
        <Loader2 size={48} className="animate-spin text-hospeda-500" />
        <p className="font-bold animate-pulse">Calculando métricas del mes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-red-400 gap-4">
        <AlertCircle size={48} />
        <p className="font-bold">{error}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Reintentar</button>
      </div>
    );
  }

  // 🚨 LÓGICA DEL ESTADO VACÍO (Si el hotel no tiene ningún dato)
  const isCompletelyEmpty = stats?.totalRevenue === 0 && stats?.totalBookings === 0 && stats?.upcomingArrivals.length === 0;

  return (
    <div className='space-y-6 pb-20'>
      
      {/* HEADER SIEMPRE VISIBLE */}
      <div className='flex justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm'>
        <div>
          <h2 className='text-2xl font-display font-bold text-slate-800'>Panel de Control</h2>
          <p className='text-slate-500 text-sm'>Resumen del rendimiento de tu propiedad este mes.</p>
        </div>
        <div className='px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm flex items-center gap-2 border border-emerald-100'>
          <TrendingUp size={16} /> En línea y Sincronizado
        </div>
      </div>

      {/* 🚨 RENDERIZADO CONDICIONAL: ESTADO VACÍO VS DASHBOARD COMPLETO */}
      {isCompletelyEmpty ? (
        <EmptyState 
          icon={Rocket} 
          title="¡Bienvenido a HospedaSuite!" 
          description="Tu hotel está en línea, pero aún no tenemos métricas para mostrar. Comienza configurando tus habitaciones o creando tu primera reserva."
          actionLabel="Ir al Calendario"
          actionHref="/dashboard/calendar"
          color="hospeda"
        />
      ) : (
        <>
          {/* MÉTRICAS CLAVE (Tarjetas Superiores) */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className='bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden'>
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl z-0"></div>
              <div className="relative z-10">
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600'><DollarSign size={24} /></div>
                  <h3 className='font-bold text-slate-500 text-sm uppercase tracking-wider'>Ingresos del Mes</h3>
                </div>
                <p className='text-4xl font-display font-bold text-slate-800 flex items-baseline gap-1'>
                  <span className='text-xl text-slate-400'>$</span>
                  {stats?.totalRevenue.toLocaleString()}
                </p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className='bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden'>
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full blur-2xl z-0"></div>
              <div className="relative z-10">
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600'><Users size={24} /></div>
                  <h3 className='font-bold text-slate-500 text-sm uppercase tracking-wider'>Ocupación Hoy</h3>
                </div>
                <div className='flex items-end gap-3'>
                  <p className='text-4xl font-display font-bold text-slate-800'>{stats?.occupancyRate}%</p>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full mb-2 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats?.occupancyRate}%` }}></div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className='bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden'>
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full blur-2xl z-0"></div>
              <div className="relative z-10">
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600'><CalendarDays size={24} /></div>
                  <h3 className='font-bold text-slate-500 text-sm uppercase tracking-wider'>Reservas Activas</h3>
                </div>
                <p className='text-4xl font-display font-bold text-slate-800'>{stats?.totalBookings}</p>
              </div>
            </motion.div>
          </div>

          {/* SECCIÓN INFERIOR: Gráfico y Llegadas */}
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            
            {/* Gráfico de Ingresos */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className='lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50'>
              <h3 className='text-lg font-bold text-slate-800 mb-6'>Evolución de Ingresos (Mes Actual)</h3>
              <div className='h-[300px] w-full'>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} tickFormatter={(value) => `$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                    />
                    <Bar dataKey="ingresos" fill="#0ea5e9" radius={[8, 8, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Próximas Llegadas */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className='bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col'>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl z-0"></div>
              
              <h3 className='text-lg font-bold text-white mb-6 relative z-10 flex items-center justify-between'>
                Próximas Llegadas
                <span className='text-xs font-bold bg-white/10 px-3 py-1 rounded-full text-blue-300'>Top 5</span>
              </h3>

              <div className='flex-1 space-y-4 relative z-10'>
                {stats?.upcomingArrivals.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-70">
                    <BedDouble size={48} className="mb-4" />
                    <p>No hay llegadas programadas próximas.</p>
                  </div>
                ) : (
                  stats?.upcomingArrivals.map((booking: any) => (
                    <div key={booking.id} className='bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors flex items-center justify-between group cursor-default'>
                      <div>
                        <p className='font-bold text-slate-200 group-hover:text-white transition-colors'>{booking.guests?.full_name}</p>
                        <p className='text-xs text-slate-400 mt-1 flex items-center gap-1'>
                          <BedDouble size={12} /> {booking.rooms?.name}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='text-sm font-bold text-blue-300'>{booking.check_in.split('-').reverse().join('/')}</p>
                        <ArrowRight size={14} className='text-slate-500 inline-block mt-1' />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

          </div>
        </>
      )}
    </div>
  );
}