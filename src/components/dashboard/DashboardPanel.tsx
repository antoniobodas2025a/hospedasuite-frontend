'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  BedDouble, 
  Sparkles, 
  Wallet, 
  Clock, 
  Activity,
  ArrowUpRight,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';

// CONTRATO ESTRICTO DE HIDRATACIÓN (RSC -> Client)
interface DashboardMetrics {
  occupiedRooms: number;
  dirtyRooms: number;
  totalPosRevenue: number;
  totalWalkInRevenue: number;
  grossRevenue: number;
}

interface DashboardPanelProps {
  hotelName: string;
  metrics: DashboardMetrics;
}

export default function DashboardPanel({ hotelName, metrics }: DashboardPanelProps) {
  const [timeString, setTimeString] = useState<string>('');

  // 1. SINCRONIZACIÓN DE RELOJ (Evita Hydration Mismatch en el Edge)
  useEffect(() => {
    const updateTime = () => {
      setTimeString(new Date().toLocaleTimeString('es-CO', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  // 2. FÍSICA DE ANIMACIÓN (GPU Accelerated)
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-8 pb-20 font-poppins text-zinc-100">
      
      {/* ========================================== */}
      {/* HEADER: CENTRO DE MANDO (Glassmorphism)    */}
      {/* ========================================== */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-zinc-900/40 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white flex items-center gap-3">
            {getGreeting()}, <span className="text-indigo-400">{hotelName}</span>
          </h1>
          <p className="text-zinc-400 font-medium text-sm mt-1 flex items-center gap-2">
            <Activity className="size-4 text-emerald-500 animate-pulse" />
            Sistemas operativos y sincronizados.
          </p>
        </div>

        <div className="bg-zinc-950/80 px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-4 shadow-inner">
          <Clock className="size-5 text-indigo-500 stroke-[1.5]" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Hora Local</span>
            <span className="font-mono font-bold text-zinc-200 tracking-tight">
              {timeString || '--:--:--'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ========================================== */}
      {/* KPI GRID: MÉTRICAS EN TIEMPO REAL          */}
      {/* ========================================== */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
      >
        {/* KPI 1: CAJA BRUTA */}
        <motion.div variants={itemVariants} className="bg-zinc-900/40 backdrop-blur-sm p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">
            <TrendingUp className="size-16 text-emerald-500 -rotate-12 transform translate-x-4 -translate-y-4" />
          </div>
          <div className="relative z-10">
            <div className="size-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-4">
              <Wallet className="size-6 stroke-[1.5]" />
            </div>
            <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Caja Bruta (Hoy)</h3>
            <p className="text-3xl font-bold text-white tracking-tighter">
              ${metrics.grossRevenue.toLocaleString('es-CO')}
            </p>
            <div className="mt-4 flex items-center text-[10px] text-emerald-400 font-bold bg-emerald-500/10 w-max px-2 py-1 rounded-lg border border-emerald-500/20">
              <ArrowUpRight className="size-3 mr-1" /> Ledger Actualizado
            </div>
          </div>
        </motion.div>

        {/* KPI 2: OCUPACIÓN ACTIVA */}
        <motion.div variants={itemVariants} className="bg-zinc-900/40 backdrop-blur-sm p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">
            <BedDouble className="size-16 text-indigo-500 transform translate-x-4 -translate-y-4" />
          </div>
          <div className="relative z-10">
            <div className="size-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20 mb-4">
              <BedDouble className="size-6 stroke-[1.5]" />
            </div>
            <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Ocupación Activa</h3>
            <p className="text-3xl font-bold text-white tracking-tighter">
              {metrics.occupiedRooms} <span className="text-lg text-zinc-500 font-medium">pax</span>
            </p>
            <div className="mt-4 flex items-center text-[10px] text-indigo-400 font-bold bg-indigo-500/10 w-max px-2 py-1 rounded-lg border border-indigo-500/20">
              En Casa
            </div>
          </div>
        </motion.div>

        {/* KPI 3: HOUSEKEEPING ALERTS */}
        <motion.div variants={itemVariants} className={cn(
          "bg-zinc-900/40 backdrop-blur-sm p-6 rounded-[2rem] border relative overflow-hidden group transition-colors",
          metrics.dirtyRooms > 0 ? "border-rose-500/30" : "border-white/5"
        )}>
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">
            <Sparkles className={cn("size-16 transform translate-x-4 -translate-y-4", metrics.dirtyRooms > 0 ? "text-rose-500" : "text-zinc-500")} />
          </div>
          <div className="relative z-10">
            <div className={cn(
              "size-12 rounded-2xl flex items-center justify-center border mb-4",
              metrics.dirtyRooms > 0 ? "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse" : "bg-zinc-800 text-zinc-400 border-white/5"
            )}>
              <Sparkles className="size-6 stroke-[1.5]" />
            </div>
            <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Requieren Aseo</h3>
            <p className="text-3xl font-bold text-white tracking-tighter">
              {metrics.dirtyRooms} <span className="text-lg text-zinc-500 font-medium">unds</span>
            </p>
            {metrics.dirtyRooms > 0 ? (
              <div className="mt-4 flex items-center text-[10px] text-rose-400 font-bold bg-rose-500/10 w-max px-2 py-1 rounded-lg border border-rose-500/20">
                Atención Requerida
              </div>
            ) : (
              <div className="mt-4 flex items-center text-[10px] text-zinc-500 font-bold bg-zinc-800 w-max px-2 py-1 rounded-lg border border-white/5">
                Al Día
              </div>
            )}
          </div>
        </motion.div>

        {/* KPI 4: DESGLOSE FINANCIERO */}
        <motion.div variants={itemVariants} className="bg-zinc-900/40 backdrop-blur-sm p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center border border-sky-500/20">
                <ShoppingCart className="size-5 stroke-[1.5]" />
              </div>
              <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Desglose POS</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                <span className="text-xs text-zinc-400 font-medium">A Habitación</span>
                <span className="font-mono text-sm font-bold text-sky-400">${metrics.totalPosRevenue.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                <span className="text-xs text-zinc-400 font-medium">Mostrador</span>
                <span className="font-mono text-sm font-bold text-emerald-400">${metrics.totalWalkInRevenue.toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}