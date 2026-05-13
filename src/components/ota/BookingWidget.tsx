'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, CheckCircle2, Clock, Users, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { springSnappy } from '@/lib/mac2026/spring';
import { GlassCard } from '@/components/ui/glass';

// ============================================================================
// BOOKING WIDGET — Sidebar de conversion para pagina OTA
// ============================================================================

interface BookingWidgetProps {
  hotelName: string;
  rooms: Array<{
    id: string;
    name: string;
    price: number;
    capacity?: number;
    status: string;
  }>;
  checkIn?: string | null;
  checkOut?: string | null;
  adults?: string | null;
  children?: string | null;
  cancellationPolicy?: string | null;
  totalRooms?: number;
}

export default function BookingWidget({
  hotelName,
  rooms,
  checkIn,
  checkOut,
  adults,
  children,
  cancellationPolicy,
  totalRooms,
}: BookingWidgetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showPolicy, setShowPolicy] = useState(false);

  const activeRooms = rooms.filter((r) => r.status === 'active');
  const minPrice = activeRooms.length > 0 ? Math.min(...activeRooms.map((r) => r.price)) : 0;
  const availableCount = activeRooms.length;

  let nights = 0;
  if (checkIn && checkOut) {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    nights = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
  }

  const totalPrice = nights > 0 ? minPrice * nights : minPrice;

  const handleReserve = () => {
    if (!checkIn || !checkOut) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const params = new URLSearchParams();
    params.set('showRoom', activeRooms[0]?.id || '');
    params.set('checkin', checkIn);
    params.set('checkout', checkOut);
    if (adults) params.set('adults', adults);
    if (children) params.set('children', children);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="sticky top-8">
      {/* Mac 2026 Glassmorphism: GlassCard with squircle radii + depth-aware blur */}
      <GlassCard className="overflow-hidden">
        {/* Header con precio */}
        <div className="bg-gradient-to-br from-primary to-primary/90 p-6 text-primary-foreground">
          <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mb-1">Desde</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black tracking-tight">${minPrice.toLocaleString()}</p>
            <span className="text-primary-foreground/70 text-sm font-medium">COP/noche</span>
          </div>
          {nights > 0 && (
            <div className="mt-3 pt-3 border-t border-primary-foreground/20">
              <p className="text-xs text-primary-foreground/70">
                Total {nights} noche{nights > 1 ? 's' : ''}: <span className="font-bold text-primary-foreground">${totalPrice.toLocaleString()} COP</span>
              </p>
            </div>
          )}
        </div>

        {/* Cuerpo del widget */}
        <div className="p-6 space-y-5">
          {/* Fechas seleccionadas */}
          {checkIn && checkOut ? (
            <div className="flex items-start gap-3 p-4 bg-secondary/10 rounded-[var(--radius-squircle-2xl)] border border-secondary/30">
              <CheckCircle2 size={18} className="text-secondary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-foreground">Fechas confirmadas</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(checkIn).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {new Date(checkOut).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </p>
                {adults && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Users size={12} /> {adults} adulto{Number(adults) > 1 ? 's' : ''}
                    {children && Number(children) > 0 ? `, ${children} nino${Number(children) > 1 ? 's' : ''}` : ''}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-warm-100/50 rounded-[var(--radius-squircle-2xl)] border border-warm-200/60">
              <Clock size={18} className="text-warm-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-foreground">Selecciona tus fechas</p>
                <p className="text-xs text-muted-foreground mt-0.5">Usa la barra de busqueda para ver disponibilidad y precios exactos.</p>
              </div>
            </div>
          )}

          {/* Disponibilidad */}
          {availableCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="size-2 rounded-full bg-secondary animate-pulse" />
                <span className="text-muted-foreground">
                  <span className="font-bold text-foreground">{availableCount}</span> de {totalRooms || availableCount} unidades disponible{availableCount > 1 ? 's' : ''}
                </span>
              </div>
              {totalRooms && totalRooms > availableCount && (
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      availableCount <= 2 ? 'bg-destructive' : 'bg-secondary',
                    )}
                    style={{ width: `${Math.round((availableCount / totalRooms) * 100)}%` }}
                  />
                </div>
              )}
              {availableCount <= 2 && (
                <p className="text-xs font-bold text-destructive flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-destructive animate-pulse" />
                  {availableCount === 1 ? 'Solo queda 1 disponible' : `Solo quedan ${availableCount} disponibles`} — Reserva ahora
                </p>
              )}
            </div>
          )}
          {availableCount === 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <div className="size-2 rounded-full bg-destructive" />
              <span className="font-bold">Sin disponibilidad</span>
            </div>
          )}

          {/* CTA principal — Mac 2026 Spring Physics: whileTap + springSnappy */}
          <motion.button
            onClick={handleReserve}
            disabled={availableCount === 0}
            whileTap={availableCount > 0 ? { scale: 0.96 } : undefined}
            transition={springSnappy()}
            className={cn(
              'w-full py-4 rounded-[var(--radius-squircle-2xl)] font-bold text-sm flex items-center justify-center gap-2 shadow-lg',
              availableCount === 0
                ? 'bg-muted text-muted-foreground/40 cursor-not-allowed shadow-none'
                : checkIn && checkOut
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-cta hover:shadow-cta'
                  : 'bg-foreground hover:bg-primary text-background shadow-foreground/20',
            )}
          >
            {checkIn && checkOut ? 'Reservar Ahora' : 'Ver Disponibilidad'}
            <ArrowRight size={16} strokeWidth={2.5} />
          </motion.button>

          {/* Divider */}
          <div className="h-px bg-border/40" />

          {/* Mejor precio garantizado — Badge destacado para canal directo */}
          <div className="relative overflow-hidden rounded-[var(--radius-squircle-2xl)] bg-gradient-to-br from-brand-50 to-warm-50 border border-brand-200/60 p-4">
            <div className="absolute top-0 right-0 size-16 bg-brand-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative flex items-start gap-3">
              <div className="size-9 rounded-[var(--radius-squircle-lg)] bg-brand-500/10 border border-brand-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck size={16} className="text-brand-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Mejor precio garantizado</p>
                <p className="text-xs text-muted-foreground mt-0.5">Reserva directo sin comisiones de intermediarios. El precio que ves aqui es el mejor disponible.</p>
              </div>
            </div>
          </div>

          {/* Beneficios adicionales */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-secondary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">Confirmacion inmediata</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tu habitacion se bloquea al instante.</p>
              </div>
            </div>
          </div>

          {/* Politica de cancelacion */}
          {cancellationPolicy && (
            <div className="border-t border-border/40 pt-4">
              <button
                onClick={() => setShowPolicy(!showPolicy)}
                className="flex items-center justify-between w-full text-left"
              >
                <p className="text-xs font-bold text-foreground">Politica de cancelacion</p>
                {showPolicy ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>
              {showPolicy && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{cancellationPolicy}</p>
              )}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
