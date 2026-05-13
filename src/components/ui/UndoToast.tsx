'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2 } from 'lucide-react';
import { springSnappy } from '@/lib/mac2026/spring';

/**
 * Mac 2026 — Undo Toast
 * Appears after destructive actions with a "Deshacer" button.
 * Auto-dismisses after 5 seconds.
 */

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  duration?: number;
}

export function UndoToast({ message, onUndo, duration = 5000 }: UndoToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={springSnappy()}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 px-6 py-4 glass-card shadow-2xl ring-1 ring-white/10"
        >
          <span className="text-sm text-zinc-300 font-medium">{message}</span>
          <button
            onClick={() => { onUndo(); setIsVisible(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-[var(--radius-squircle-lg)] font-bold text-sm transition-all active:scale-95"
          >
            <Undo2 size={14} /> Deshacer
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
