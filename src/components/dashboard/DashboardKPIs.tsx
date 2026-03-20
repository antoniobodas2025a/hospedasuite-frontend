'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  LogIn,
  LogOut,
  BedDouble,
  AlertCircle,
} from 'lucide-react';

interface DashboardStats {
  occupancyRate: number;
  arrivalsToday: number;
  departuresToday: number;
  activeGuests: number;
  revenueToday: number;
  dirtyRooms: number;
}

const DashboardKPIs = ({ stats }: { stats: DashboardStats }) => {
  const cards = [
    {
      title: 'Ocupación Real',
      value: `${stats.occupancyRate}%`,
      sub: `${stats.activeGuests} huéspedes en casa`,
      icon: (
        <BedDouble
          size={24}
          className='text-blue-500'
        />
      ),
      color: 'bg-blue-50 border-blue-100',
      trend: stats.occupancyRate > 50 ? 'text-emerald-500' : 'text-amber-500',
    },
    {
      title: 'Ingresos Hoy',
      value: `$${stats.revenueToday.toLocaleString()}`,
      sub: 'Pagos registrados en caja',
      icon: (
        <TrendingUp
          size={24}
          className='text-emerald-500'
        />
      ),
      color: 'bg-emerald-50 border-emerald-100',
      trend: 'text-emerald-500',
    },
    {
      title: 'Llegadas (Check-in)',
      value: stats.arrivalsToday,
      sub: 'Reservas para hoy',
      icon: (
        <LogIn
          size={24}
          className='text-indigo-500'
        />
      ),
      color: 'bg-indigo-50 border-indigo-100',
      trend: 'text-slate-500',
    },
    {
      title: 'Salidas (Check-out)',
      value: stats.departuresToday,
      sub: 'Pendientes por salir',
      icon: (
        <LogOut
          size={24}
          className='text-amber-500'
        />
      ),
      color: 'bg-amber-50 border-amber-100',
      trend: 'text-slate-500',
    },
  ];

  return (
    <div className='space-y-6'>
      {/* GRID PRINCIPAL */}
      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6'>
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-6 rounded-[2rem] border ${card.color} relative overflow-hidden group hover:shadow-lg transition-all`}
          >
            <div className='absolute top-0 right-0 p-6 opacity-50 group-hover:scale-110 transition-transform'>
              {card.icon}
            </div>
            <div className='relative z-10'>
              <p className='text-sm font-bold text-slate-500 uppercase tracking-wider mb-2'>
                {card.title}
              </p>
              <h3 className='text-3xl font-display font-bold text-slate-800 mb-1'>
                {card.value}
              </h3>
              <p className='text-xs font-bold text-slate-400 flex items-center gap-1'>
                {card.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ALERTAS OPERATIVAS */}
      {stats.dirtyRooms > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700 font-bold'
        >
          <AlertCircle size={20} />
          <span>
            Atención: Hay {stats.dirtyRooms} habitaciones marcadas como SUCIAS
            que necesitan limpieza inmediata.
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default DashboardKPIs;
