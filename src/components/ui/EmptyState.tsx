'use client';

import React from 'react';
import { Rocket, Calendar, Utensils, AlertCircle, Search, LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// ==========================================
// BLOQUE 1: TIPADO Y MAPEO ESTRUCTURAL
// ==========================================

const ICON_MAP: Record<string, LucideIcon> = {
  rocket: Rocket,
  calendar: Calendar,
  utensils: Utensils,
  alert: AlertCircle,
  search: Search
};

interface EmptyStateProps {
  icon?: LucideIcon; // Soporte para componentes inyectados directamente
  iconName?: keyof typeof ICON_MAP | string; // Soporte legacy
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  color?: 'hospeda' | 'slate' | 'emerald' | 'orange' | 'zinc'; // Tema 'zinc' integrado
}

// ==========================================
// BLOQUE 2: COMPONENTE PRESENTACIONAL BLINDADO
// ==========================================

export default function EmptyState({
  icon: IconComponent,
  iconName,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  color = 'hospeda'
}: EmptyStateProps) {

  // 1. Resolución Segura de Icono (Zero Trust)
  // Prefiere el componente inyectado, luego el mapa por nombre, y por último un fallback.
  const ResolvedIcon = IconComponent || (iconName && ICON_MAP[iconName as keyof typeof ICON_MAP]) || AlertCircle;

  // 2. Diccionario de Clases Explícito (Erradica el uso destructivo de .split)
  const colorMap: Record<string, { bg: string; text: string; btn: string; container: string; title: string; desc: string }> = {
    hospeda: {
      bg: 'bg-hospeda-50', text: 'text-hospeda-600', btn: 'bg-hospeda-900 hover:bg-black text-white',
      container: 'bg-white border-slate-100 shadow-sm', title: 'text-slate-800', desc: 'text-slate-500'
    },
    slate: {
      bg: 'bg-slate-50', text: 'text-slate-400', btn: 'bg-slate-900 hover:bg-black text-white',
      container: 'bg-white border-slate-100 shadow-sm', title: 'text-slate-800', desc: 'text-slate-500'
    },
    emerald: {
      bg: 'bg-emerald-500/10', text: 'text-emerald-500', btn: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      container: 'bg-white border-slate-100 shadow-sm', title: 'text-slate-800', desc: 'text-slate-500'
    },
    orange: {
      bg: 'bg-orange-500/10', text: 'text-orange-500', btn: 'bg-orange-500 hover:bg-orange-600 text-white',
      container: 'bg-white border-slate-100 shadow-sm', title: 'text-slate-800', desc: 'text-slate-500'
    },
    zinc: { 
      // Tema Estándar Claude 2026 (Liquid Glass Oscuro)
      bg: 'bg-zinc-800/50', text: 'text-zinc-400', btn: 'bg-zinc-100 hover:bg-white text-zinc-900',
      container: 'bg-zinc-900/40 backdrop-blur-2xl border-white/5 shadow-2xl ring-1 ring-inset ring-white/10', 
      title: 'text-zinc-50', desc: 'text-zinc-400'
    }
  };

  // 3. Fallback de Seguridad Operacional
  const theme = colorMap[color] || colorMap['hospeda'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className={`w-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center rounded-[2.5rem] border ${theme.container}`}
    >
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner ${theme.bg} ${theme.text}`}>
        <ResolvedIcon size={40} strokeWidth={1.5} />
      </div>
      
      <h3 className={`text-2xl font-display font-bold mb-4 ${theme.title}`}>
        {title}
      </h3>
      
      <p className={`max-w-md mx-auto mb-8 leading-relaxed ${theme.desc}`}>
        {description}
      </p>

      {/* Renderizado Condicional Seguro para Call To Actions */}
      {(actionLabel && (actionHref || actionOnClick)) && (
        actionHref ? (
          <Link 
            href={actionHref} 
            className={`px-8 py-3 rounded-xl font-bold transition-all active:scale-95 ${theme.btn}`}
          >
            {actionLabel}
          </Link>
        ) : (
          <button 
            onClick={actionOnClick} 
            className={`px-8 py-3 rounded-xl font-bold transition-all active:scale-95 ${theme.btn}`}
          >
            {actionLabel}
          </button>
        )
      )}
    </motion.div>
  );
}