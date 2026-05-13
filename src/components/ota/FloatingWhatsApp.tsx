'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// FLOATING WHATSAPP — Boton flotante para consultas directas
//
// Aparece despues de scrollear. En LATAM, 40% de consultas hoteleras son por WA.
// ============================================================================

interface FloatingWhatsAppProps {
  phoneNumber: string;
  message?: string;
  hotelName?: string;
}

export default function FloatingWhatsApp({ phoneNumber, message, hotelName }: FloatingWhatsAppProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const waMessage = message || `Hola! Me interesa reservar en ${hotelName || 'su hotel'}. Podrian darme mas informacion?`;
  const waUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(waMessage)}`;

  return (
    <>
      {/* Tooltip */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 bg-card rounded-[var(--radius-squircle-2xl)] shadow-2xl border border-border p-4 w-72 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 size-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
          <div className="flex items-start gap-3 mb-3">
            <div className="size-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <MessageCircle size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{hotelName || 'Nuestro Equipo'}</p>
              <p className="text-xs text-muted-foreground">En linea</p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-[var(--radius-squircle-lg)] p-3 mb-3">
            <p className="text-sm text-muted-foreground">
              Hola! Necesitas ayuda para reservar? Escribinos por WhatsApp y te respondemos al instante.
            </p>
          </div>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white text-center text-sm font-bold py-3 rounded-[var(--radius-squircle-lg)] transition-colors"
          >
            Iniciar Chat
          </a>
        </div>
      )}

      {/* Boton flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 size-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center transition-all duration-300 active:scale-90',
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none',
        )}
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle size={28} />
      </button>
    </>
  );
}
