'use client';

import React from 'react';
import { Rocket, Calendar, Utensils, AlertCircle, Search, LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const ICON_MAP: Record<string, LucideIcon> = {
  rocket: Rocket,
  calendar: Calendar,
  utensils: Utensils,
  alert: AlertCircle,
  search: Search
};

interface EmptyStateProps {
  icon?: LucideIcon;
  iconName?: keyof typeof ICON_MAP | string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  color?: 'brand' | 'muted' | 'secondary' | 'warm' | 'zinc';
}

export default function EmptyState({
  icon: IconComponent,
  iconName,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  color = 'brand'
}: EmptyStateProps) {

  const ResolvedIcon = IconComponent || (iconName && ICON_MAP[iconName as keyof typeof ICON_MAP]) || AlertCircle;

  const colorMap: Record<string, { bg: string; text: string; btn: string; container: string; title: string; desc: string }> = {
    brand: {
      bg: 'bg-brand-50', text: 'text-brand-600', btn: 'bg-brand-900 hover:bg-brand-800 text-white',
      container: 'bg-card border-border shadow-sm', title: 'text-foreground', desc: 'text-muted-foreground'
    },
    muted: {
      bg: 'bg-muted', text: 'text-muted-foreground', btn: 'bg-foreground hover:bg-brand-800 text-background',
      container: 'bg-card border-border shadow-sm', title: 'text-foreground', desc: 'text-muted-foreground'
    },
    secondary: {
      bg: 'bg-secondary/10', text: 'text-secondary', btn: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
      container: 'bg-card border-border shadow-sm', title: 'text-foreground', desc: 'text-muted-foreground'
    },
    warm: {
      bg: 'bg-warm-500/10', text: 'text-warm-500', btn: 'bg-warm-500 hover:bg-warm-600 text-white',
      container: 'bg-card border-border shadow-sm', title: 'text-foreground', desc: 'text-muted-foreground'
    },
    zinc: {
      bg: 'bg-zinc-800/50', text: 'text-zinc-400', btn: 'bg-zinc-100 hover:bg-white text-zinc-900',
      container: 'glass-card shadow-2xl ring-1 ring-inset ring-white/10',
      title: 'text-zinc-50', desc: 'text-zinc-400'
    }
  };

  const theme = colorMap[color] || colorMap['brand'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center rounded-[var(--radius-squircle-3xl)] border ${theme.container}`}
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

      {(actionLabel && (actionHref || actionOnClick)) && (
        actionHref ? (
          <Link
            href={actionHref}
            className={`px-8 py-3 rounded-[var(--radius-squircle-lg)] font-bold transition-all active:scale-95 ${theme.btn}`}
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={actionOnClick}
            className={`px-8 py-3 rounded-[var(--radius-squircle-lg)] font-bold transition-all active:scale-95 ${theme.btn}`}
          >
            {actionLabel}
          </button>
        )
      )}
    </motion.div>
  );
}
