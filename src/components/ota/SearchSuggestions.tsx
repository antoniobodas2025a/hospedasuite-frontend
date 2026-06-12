'use client';

/**
 * SearchSuggestions — Smart fallback UI for Channel search.
 *
 * Three display modes:
 *   - 'typo':        "¿Querías decir X?" — fuzzy correction suggestion
 *   - 'alternative': Popular alternative searches when no results
 *   - 'empty':       "Explorá otra zona" with city suggestions
 *
 * Glassmorphic card with spring animations (Mac 2026 aesthetics).
 */

import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Sparkles, ArrowRight } from 'lucide-react';
import { springGentle, springSnappy } from '@/lib/mac2026/spring';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SearchSuggestion {
  /** Display text (e.g., "Medellín", "Cartagena") */
  text: string;
  /** Optional subtitle (e.g., "150 alojamientos") */
  subtitle?: string;
  /** Action value to pass to onSuggestionClick */
  action: string;
  /** Visual distinction */
  icon?: 'city' | 'category' | 'region';
}

export interface SearchSuggestionsProps {
  /** Array of suggestions to display */
  suggestions: SearchSuggestion[];
  /** Called when user clicks/taps a suggestion */
  onSuggestionClick: (suggestion: SearchSuggestion) => void;
  /** Display mode: typo correction, alternatives, or empty state */
  type: 'typo' | 'alternative' | 'empty';
  /** Optional class name for the wrapper */
  className?: string;
}

// ── Icon mapping ──────────────────────────────────────────────────────────────

function suggestionIcon(type: SearchSuggestion['icon']) {
  switch (type) {
    case 'city':
      return <MapPin size={16} className='text-brand-500 shrink-0' />;
    case 'category':
      return <Search size={16} className='text-amber-500 shrink-0' />;
    case 'region':
      return <Sparkles size={16} className='text-emerald-500 shrink-0' />;
    default:
      return <Search size={16} className='text-muted-foreground shrink-0' />;
  }
}

// ── Inner card variants ───────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springGentle(),
      delay: i * 0.06,
    },
  }),
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SearchSuggestions({
  suggestions,
  onSuggestionClick,
  type,
  className,
}: SearchSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  const isTypo = type === 'typo';
  const isAlternative = type === 'alternative';
  const isEmpty = type === 'empty';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle()}
      className={cn(
        'glass-card border border-border/30',
        'rounded-[var(--radius-squircle-xl)]',
        'p-5 sm:p-6',
        'max-w-2xl mx-auto',
        className,
      )}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className='flex items-center gap-2 mb-4'>
        {isTypo && (
          <>
            <div className='size-2 rounded-full bg-amber-400 shrink-0' />
            <h3 className='text-sm font-bold text-foreground'>
              ¿Querías decir…?
            </h3>
          </>
        )}
        {isAlternative && (
          <>
            <div className='size-2 rounded-full bg-brand-400 shrink-0' />
            <h3 className='text-sm font-bold text-foreground'>
              También te puede interesar
            </h3>
          </>
        )}
        {isEmpty && (
          <>
            <div className='size-2 rounded-full bg-emerald-400 shrink-0' />
            <h3 className='text-sm font-bold text-foreground'>
              Explorá otra zona
            </h3>
          </>
        )}
      </div>

      {/* ── Typo: single prominent suggestion ──────────────────── */}
      {isTypo && suggestions[0] && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springSnappy(), delay: 0.1 }}
          onClick={() => onSuggestionClick(suggestions[0])}
          className='w-full flex items-center gap-3 px-4 py-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-[var(--radius-squircle-lg)] hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors group'
        >
          <Search size={18} className='text-amber-600 shrink-0' />
          <span className='flex-1 text-left text-sm font-semibold text-amber-900 dark:text-amber-100'>
            {suggestions[0].text}
          </span>
          <ArrowRight
            size={16}
            className='text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0'
          />
        </motion.button>
      )}

      {/* ── Alternatives / Empty: suggestion list ───────────────── */}
      {!isTypo && (
        <div className='space-y-2'>
          <AnimatePresence>
            {suggestions.map((suggestion, i) => (
              <motion.button
                key={`${suggestion.action}-${i}`}
                custom={i}
                variants={cardVariants}
                initial='hidden'
                animate='visible'
                exit='hidden'
                whileTap={{ scale: 0.98 }}
                onClick={() => onSuggestionClick(suggestion)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3',
                  'rounded-[var(--radius-squircle-lg)]',
                  'border border-border/20',
                  'bg-white/60 dark:bg-white/5',
                  'hover:bg-brand-50 dark:hover:bg-brand-950/30',
                  'hover:border-brand-200 dark:hover:border-brand-800/50',
                  'transition-colors group',
                )}
              >
                {suggestionIcon(suggestion.icon)}
                <div className='flex-1 text-left min-w-0'>
                  <p className='text-sm font-semibold text-foreground truncate'>
                    {suggestion.text}
                  </p>
                  {suggestion.subtitle && (
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      {suggestion.subtitle}
                    </p>
                  )}
                </div>
                <ArrowRight
                  size={14}
                  className='text-muted-foreground/40 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0'
                />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Footer hint ─────────────────────────────────────────── */}
      {isTypo && suggestions.length > 1 && (
        <div className='mt-3 pt-3 border-t border-border/20'>
          <p className='text-xs text-muted-foreground text-center'>
            ¿No es lo que buscás? Probá con otra búsqueda arriba
          </p>
        </div>
      )}
      {isEmpty && (
        <p className='mt-4 text-xs text-muted-foreground text-center'>
          También podés buscar en toda Colombia sin filtro de ubicación
        </p>
      )}
    </motion.div>
  );
}
