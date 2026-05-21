'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, AlertTriangle, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { springBounce, springGentle } from '@/lib/mac2026/spring';
import { cn } from '@/lib/utils';
import { setGoLiveAction } from '@/app/actions/readiness';
import type { ReadinessItem } from '@/lib/readiness-validation';

// ─── Props ───────────────────────────────────────────────────────

interface GoLiveCTAProps {
  hotelId: string;
  isGoLiveReady: boolean;
  isAlreadyLive: boolean;
  items: ReadinessItem[];
}

// ─── Component ───────────────────────────────────────────────────

export default function GoLiveCTA({
  hotelId,
  isGoLiveReady,
  isAlreadyLive,
  items,
}: GoLiveCTAProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Missing Required checks — items that are incomplete AND required for the current plan
  const missingRequired = useMemo(
    () =>
      items.filter(
        (item) =>
          item.status === 'incomplete' &&
          item.requiredForPlans.length > 0,
      ),
    [items],
  );

  const handleGoLive = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await setGoLiveAction(hotelId);
      if (res.success) {
        setResult({
          success: true,
          message: '¡Hotel publicado exitosamente! Ya estás listo para recibir reservas.',
        });
      } else {
        setResult({
          success: false,
          message: res.error ?? 'Error al publicar el hotel. Intentá de nuevo.',
        });
      }
    } catch {
      setResult({
        success: false,
        message: 'Error inesperado al publicar el hotel. Intentá de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Already live — show confirmation badge
  if (isAlreadyLive) {
    return (
      <motion.div
        className="flex items-center justify-center gap-3 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[var(--radius-squircle-2xl)] max-w-sm mx-auto font-poppins"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springGentle()}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              ¡Hotel Publicado!
            </p>
            <p className="text-[11px] text-emerald-400/60">
              Tu hotel ya está disponible para recibir reservas.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 font-poppins">
      {/* CTA Row */}
      <div className="relative">
        {/* Tooltip for blocked state */}
        <AnimatePresence>
          {showTooltip && !isGoLiveReady && missingRequired.length > 0 && (
            <motion.div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-4 bg-zinc-900/95 border border-zinc-700/50 rounded-[var(--radius-squircle-xl)] shadow-2xl backdrop-blur-xl z-50"
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={springGentle()}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs font-semibold text-amber-400">
                  Completá estos requisitos antes de publicar:
                </p>
              </div>
              <ul className="space-y-1.5">
                {missingRequired.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <XCircle size={12} className="text-rose-400 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-zinc-300 leading-tight">
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
              {/* Arrow */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
                <div className="w-3 h-3 bg-zinc-900/95 border-r border-b border-zinc-700/50 rotate-45" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          disabled={!isGoLiveReady || loading}
          onClick={handleGoLive}
          onMouseEnter={() => !isGoLiveReady && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={cn(
            'relative flex items-center gap-3 px-8 py-4 rounded-[var(--radius-squircle-2xl)] font-semibold text-sm transition-all duration-300',
            isGoLiveReady
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 hover:shadow-emerald-400/30 cursor-pointer'
              : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 cursor-not-allowed',
          )}
          whileHover={isGoLiveReady && !loading ? { scale: 1.03 } : {}}
          whileTap={isGoLiveReady && !loading ? { scale: 0.97 } : {}}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springBounce()}
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Rocket size={20} className={isGoLiveReady ? 'text-white' : 'text-zinc-500'} />
          )}
          <span>
            {loading ? 'Publicando...' : 'Publicar Hotel'}
          </span>
        </motion.button>
      </div>

      {/* Incomplete count indicator */}
      {!isGoLiveReady && missingRequired.length > 0 && (
        <motion.p
          className="text-[11px] text-zinc-500 text-center max-w-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {missingRequired.length} requisito{missingRequired.length !== 1 ? 's' : ''} pendiente
          {missingRequired.length !== 1 ? 's' : ''}. Pasá el cursor sobre el botón para ver detalles.
        </motion.p>
      )}

      {/* Result message */}
      <AnimatePresence>
        {result && (
          <motion.div
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-squircle-lg)] text-xs font-medium max-w-sm',
              result.success
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
            )}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springGentle()}
          >
            {result.success ? (
              <CheckCircle size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            <span>{result.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
