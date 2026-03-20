'use client';

import React from 'react';
import { Rocket, Calendar, Utensils, AlertCircle, Search, LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Mapa de íconos para evitar el error de serialización
const ICON_MAP: Record<string, LucideIcon> = {
  rocket: Rocket,
  calendar: Calendar,
  utensils: Utensils,
  alert: AlertCircle,
  search: Search
};

interface EmptyStateProps {
  iconName: keyof typeof ICON_MAP; // String seguro
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  color?: 'hospeda' | 'slate' | 'emerald' | 'orange';
}

export default function EmptyState({ iconName, title, description, actionLabel, actionHref, actionOnClick, color = 'hospeda' }: EmptyStateProps) {
  const Icon = ICON_MAP[iconName] || AlertCircle;
  const colorStyles = {
    hospeda: 'bg-hospeda-50 text-hospeda-600 hover:bg-hospeda-100',
    slate: 'bg-slate-50 text-slate-400 hover:bg-slate-900',
    emerald: 'bg-emerald-50 text-emerald-500 hover:bg-emerald-600',
    orange: 'bg-orange-50 text-orange-500 hover:bg-orange-600',
  };
  const bgIconColor = colorStyles[color].split(' ')[0];
  const textIconColor = colorStyles[color].split(' ')[1];
  const btnColor = color === 'hospeda' ? 'bg-hospeda-900 hover:bg-black' : color === 'slate' ? 'bg-slate-900 hover:bg-black' : color === 'emerald' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
      <div className={`w-24 h-24 ${bgIconColor} ${textIconColor} rounded-full flex items-center justify-center mb-6 shadow-inner`}>
        <Icon size={40} strokeWidth={1.5} />
      </div>
      <h3 className="text-2xl font-display font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-sm mx-auto mb-8">{description}</p>
      {actionLabel && (
        actionHref ? (
          <Link href={actionHref} className={`px-8 py-4 ${btnColor} text-white font-bold rounded-2xl shadow-lg`}>{actionLabel}</Link>
        ) : (
          <button onClick={actionOnClick} className={`px-8 py-4 ${btnColor} text-white font-bold rounded-2xl shadow-lg`}>{actionLabel}</button>
        )
      )}
    </motion.div>
  );
}