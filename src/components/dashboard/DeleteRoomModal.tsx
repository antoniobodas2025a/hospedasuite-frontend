'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeleteRoomModalProps {
  roomName: string;
  onConfirm: () => void;
  onClose: () => void;
  isDeleting: boolean;
}

export default function DeleteRoomModal({ roomName, onConfirm, onClose, isDeleting }: DeleteRoomModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const requiredText = 'ELIMINAR';

  const canDelete = confirmText === requiredText && !isDeleting;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md glass-panel flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center glass-card !rounded-none">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-[var(--radius-squircle-2xl)] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="size-6 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Eliminar Habitación</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-3 bg-muted hover:bg-rose-500/20 rounded-[var(--radius-squircle-2xl)] transition-colors text-muted-foreground hover:text-rose-400 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-6 font-poppins text-foreground">
          {/* Warning */}
          <div className="rounded-[var(--radius-squircle-xl)] border border-rose-500/20 bg-rose-500/5 p-5 space-y-3">
            <p className="text-sm text-rose-300/90 leading-relaxed">
              Estás a punto de eliminar permanentemente{' '}
              <span className="font-bold text-rose-300">"{roomName}"</span>.
            </p>
            <ul className="space-y-1.5 text-xs text-rose-400/70">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 size-1.5 rounded-full bg-rose-500/60 flex-shrink-0" />
                Se perderán las fotos, precios y configuración.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 size-1.5 rounded-full bg-rose-500/60 flex-shrink-0" />
                Los tokens iCal existentes quedarán inválidos.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 size-1.5 rounded-full bg-rose-500/60 flex-shrink-0" />
                Esta acción no se puede deshacer.
              </li>
            </ul>
          </div>

          {/* Type to confirm */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Escribí <span className="text-rose-400 font-black">{requiredText}</span> para confirmar
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requiredText}
              disabled={isDeleting}
              className={cn(
                'w-full bg-muted/50 border rounded-[var(--radius-squircle-lg)] px-4 py-3.5 text-sm font-mono font-bold tracking-widest text-center outline-none transition-all placeholder:text-muted-foreground/40 disabled:opacity-50',
                confirmText.length > 0 && confirmText !== requiredText
                  ? 'border-rose-500/50 text-rose-400 focus:ring-2 focus:ring-rose-500/20'
                  : canDelete
                    ? 'border-emerald-500/50 text-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-border text-foreground focus:border-rose-500/30 focus:ring-2 focus:ring-rose-500/10'
              )}
              autoFocus
            />
            {/* Progress indicator */}
            {confirmText.length > 0 && (
              <div className="flex gap-1 justify-center">
                {requiredText.split('').map((char, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-5 h-1 rounded-full transition-all duration-200',
                      i < confirmText.length
                        ? confirmText[i] === char
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                        : 'bg-muted'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-card flex justify-between gap-4">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!canDelete}
            className={cn(
              'px-8 py-3 text-[10px] font-bold uppercase tracking-widest rounded-[var(--radius-squircle-lg)] transition-all flex items-center gap-2',
              canDelete
                ? 'bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:bg-rose-500 hover:shadow-[0_0_30px_rgba(225,29,72,0.4)] active:scale-95'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isDeleting ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  className="inline-block"
                >
                  <Trash2 className="size-4" />
                </motion.span>
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Eliminar Habitación
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
