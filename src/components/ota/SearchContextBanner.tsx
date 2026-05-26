'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { springSnappy } from '@/lib/mac2026/spring';

interface SearchContextBannerProps {
  context: {
    location: string | null;
    checkin: string | null;
    checkout: string | null;
    guests: number | null;
    category: string | null;
    search: string | null;
  };
}

/**
 * SearchContextBanner — Shows current search context on hotel detail page.
 *
 * Displays: "Searching for [category] in [location] · [dates] · [guests]"
 * With a "Modify search" link that returns to homepage with all params preserved.
 */
export function SearchContextBanner({ context }: SearchContextBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Build human-readable search description
  const parts: string[] = [];

  if (context.category && context.category !== 'all') {
    const categoryLabels: Record<string, string> = {
      glamping: 'Glampings',
      hotel: 'Hoteles',
      cabin: 'Cabañas',
      boutique: 'Boutique',
    };
    parts.push(categoryLabels[context.category] || context.category);
  }

  if (context.location) {
    parts.push(`en ${context.location}`);
  }

  if (context.search) {
    parts.push(`"${context.search}"`);
  }

  if (context.checkin && context.checkout) {
    const from = new Date(context.checkin).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const to = new Date(context.checkout).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    parts.push(`${from} → ${to}`);
  }

  if (context.guests && context.guests > 1) {
    parts.push(`${context.guests} huéspedes`);
  }

  if (parts.length === 0) return null;

  const description = parts.join(' · ');

  const handleModifySearch = () => {
    // Build URL with all search params preserved
    const params = new URLSearchParams();
    if (context.location) params.set('location', context.location);
    if (context.checkin) params.set('checkin', context.checkin);
    if (context.checkout) params.set('checkout', context.checkout);
    if (context.guests) params.set('guests', context.guests.toString());
    if (context.category) params.set('category', context.category);
    if (context.search) params.set('search', context.search);

    const query = params.toString();
    router.push(`/?${query}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={springSnappy()}
      className="bg-brand-50/50 border-b border-brand-200/60"
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 flex items-center gap-3">
        <Search size={14} className="text-brand-600 shrink-0" />
        <p className="text-xs text-brand-800 flex-1 truncate">
          <span className="font-bold">Buscando:</span> {description}
        </p>
        <button
          onClick={handleModifySearch}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors shrink-0"
        >
          <ArrowLeft size={12} />
          Modificar búsqueda
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="size-5 rounded-full flex items-center justify-center hover:bg-brand-200/50 hover:text-brand-700 transition-colors shrink-0 text-brand-500"
          aria-label="Cerrar banner"
        >
          <X size={10} strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  );
}
