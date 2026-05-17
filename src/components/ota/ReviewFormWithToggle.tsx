'use client';

import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReviewForm from './ReviewForm';

interface ReviewFormWithToggleProps {
  hotelId: string;
  hotelName: string;
}

export default function ReviewFormWithToggle({ hotelId, hotelName }: ReviewFormWithToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-foreground">Escribir opinión</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Cerrar formulario"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>
        <ReviewForm hotelId={hotelId} hotelName={hotelName} />
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-border/40">
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-[var(--radius-squircle-lg)] bg-muted border border-border text-foreground font-bold text-sm hover:bg-accent hover:border-brand-500/30 transition-all"
      >
        <MessageSquare size={18} className="text-brand-500" />
        Escribir una opinión
      </button>
      <p className="text-xs text-muted-foreground/60 text-center mt-3">
        Solo huéspedes con una estadía completada pueden dejar una opinión.
      </p>
    </div>
  );
}
