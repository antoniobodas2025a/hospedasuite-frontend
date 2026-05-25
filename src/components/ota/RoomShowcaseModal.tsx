'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  X, ArrowRight, Users, Calendar, 
  Star,
  Info, ClipboardList, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { Room, GalleryItem } from '@/types';
import { GlassCard } from '@/components/ui/glass';
import RoomGallery from './RoomGallery';
import { getRoomAmenityById } from '@/lib/amenity-registry';
import { useTranslations, useLocale } from 'next-intl';
import { getDateFnsLocale } from '@/lib/date-locale';

interface HotelForModal {
  slug: string;
  name?: string;
  rooms?: Array<Partial<Room> & { price_per_night?: number }>;
}

// GlassCard imported from @/components/ui/glass (design system, theme-aware)

// ============================================================================
// AMENITY GLASS — Desktop: icon + title + story. Mobile: icon-only chip.
// ============================================================================
function AmenityGlass({ icon: Icon, title, story, compact }: { icon: React.ElementType; title: string; story: string; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-[var(--radius-squircle-lg)] bg-gradient-to-br from-brand-500/5 to-warm-400/5 border border-brand-500/10 transition-all hover:from-brand-500/10 hover:to-warm-400/10">
        <Icon size={20} className="text-brand-500" strokeWidth={1.5} />
        <p className="text-[10px] font-semibold text-foreground text-center leading-tight line-clamp-1">{title}</p>
      </div>
    );
  }
  return (
    <div className="group flex gap-3 p-3 rounded-[var(--radius-squircle-lg)] transition-all duration-300 hover:bg-white/40 hover:shadow-md hover:shadow-brand-500/5">
      <div className="shrink-0 size-10 rounded-[var(--radius-squircle-lg)] bg-gradient-to-br from-brand-500/10 to-warm-400/10 border border-brand-500/15 flex items-center justify-center transition-all group-hover:from-brand-500/20 group-hover:to-warm-400/20 group-hover:scale-105">
        <Icon size={18} className="text-brand-500" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed font-lora">{story}</p>
      </div>
    </div>
  );
}

export function RoomShowcaseModal({ hotel }: { hotel: HotelForModal }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const appLocale = useLocale();
  const dateLocale = getDateFnsLocale(appLocale);
  
  const roomId = searchParams.get('showRoom');
  const checkIn = searchParams.get('checkin');
  const checkOut = searchParams.get('checkout');
  const guests = Number(searchParams.get('guests')) || 0;

  // Default guest count for booking (can be adjusted in checkout)
  const defaultGuests = guests > 0 ? guests : 2;

  const room = useMemo(() => 
    hotel.rooms?.find((r) => r.id === roomId), 
  [hotel.rooms, roomId]);

  const closeModal = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('showRoom');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  if (!roomId) return null;

  // ESCUDO UX: Fechas Faltantes
  if (!checkIn || !checkOut) {
    return (
      <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-xl" onClick={closeModal} />
        <div className="relative z-10 glass-panel p-10 w-full max-w-md text-center shadow-2xl shadow-elev-2 animate-in zoom-in-95 duration-200">
          <div className="size-16 rounded-[var(--radius-squircle-2xl)] bg-gradient-to-br from-brand-500/10 to-warm-400/10 border border-brand-500/15 flex items-center justify-center mx-auto mb-6">
            <Calendar size={28} className="text-brand-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">{t('ota.showcase.defineStay')}</h2>
          <p className="text-muted-foreground mb-8 text-sm">{t('ota.showcase.defineStayDesc')}</p>
          <button onClick={() => { closeModal(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
            className="w-full glass-card text-foreground font-semibold py-4 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 active:scale-[0.98]">
            {t('ota.showcase.selectDates')} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (!room) return null;

  const dateFrom = parseISO(checkIn);
  const dateTo = parseISO(checkOut);
  const nights = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 3600 * 24)));
  const basePrice = room.price_per_night || room.price || 0;
  // Mac 2026: Price coherence — IVA 19% included to match RoomCard and CheckoutForm
  const subtotal = basePrice * nights;
  const taxes = Math.round(subtotal * 0.19);
  const totalPrice = subtotal + taxes;
  const isOverCapacity = defaultGuests > Number(room.capacity ?? 0);

  const handleCheckout = () => {
    if (isOverCapacity) return;
    const params = new URLSearchParams();
    params.set('room', room.id!);
    params.set('checkin', checkIn);
    params.set('checkout', checkOut);
    params.set('guests', defaultGuests.toString());
    router.push(`/book/${hotel.slug}/checkout?${params.toString()}`);
  };

  const rawGallery = room.gallery ?? [];
  const images: GalleryItem[] = Array.isArray(rawGallery)
    ? (rawGallery as (string | GalleryItem)[]).map((img) => typeof img === 'string' ? { url: img } : img)
    : [];
  if (images.length === 0) {
    images.push({ url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32' });
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center sm:p-3 lg:p-5 animate-in fade-in duration-200">
      {/* Backdrop con blur pesado */}
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-2xl" onClick={closeModal} />
      
      {/* MODAL CONTAINER — Liquid Glass */}
      <div className="relative w-full max-w-7xl h-[96vh] sm:h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300 sm:rounded-[var(--radius-squircle-2xl)] rounded-t-[2rem] glass-panel">
        
        {/* Boton cerrar glass */}
        <button onClick={closeModal} className="absolute top-4 right-4 z-30 size-10 flex items-center justify-center rounded-full glass-pill text-foreground/70 hover:bg-accent/25 hover:scale-110 hover:text-foreground transition-all shadow-lg shadow-elev-1 active:scale-95">
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* DESKTOP SPLIT PANEL (lg+) */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          
          {/* PANEL IZQUIERDO: Galeria (fondo oscuro, sin scroll) */}
          <div className="w-1/2 bg-foreground relative">
            <RoomGallery 
              images={images} 
              roomName={room.name ?? t('ota.showcase.fallbackRoom')} 
              onClose={closeModal}
              variant="inline"
            />
          </div>

          {/* PANEL DERECHO: Info + Resumen (scrolleable, fondo claro) */}
          <div className="w-1/2 flex flex-col overflow-hidden bg-gradient-to-b from-muted/80 to-background/60">
            
            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-7 xl:p-9 space-y-6">
                
                {/* Nombre + Descripcion */}
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warm-500/10 backdrop-blur-xl border border-warm-500/20 text-warm-700 text-[10px] font-bold uppercase tracking-widest">
                    <Star size={11} className="fill-warm-500" /> {t('ota.showcase.authorsPick')}
                  </span>
                  <h2 className="text-3xl xl:text-4xl font-black text-foreground tracking-tight leading-tight">{room.name}</h2>
                  <p className="text-[15px] text-muted-foreground font-lora leading-relaxed italic">
                    {room.description || t('ota.showcase.fallbackDescription')}
                  </p>
                </div>

                {/* Amenidades con Glass Cards — Desktop: full detail */}
                {room.amenities && room.amenities.length > 0 && (
                  <GlassCard className="p-5">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-brand-400" />
                      {t('ota.showcase.amenities')}
                    </h3>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-1">
                      {room.amenities.map((amenity: string | { id: string; details?: string }, idx: number) => {
                        const id = typeof amenity === 'string' ? amenity : amenity.id;
                        const entry = getRoomAmenityById(id);
                        if (!entry) return null;
                        const template = entry.storyTitle
                          ? { icon: entry.icon, title: entry.storyTitle, story: entry.storyDescription || t('ota.showcase.premiumService') }
                          : { icon: entry.icon, title: entry.label.toUpperCase(), story: t('ota.showcase.premiumService') };
                        return (
                          <AmenityGlass
                            key={idx}
                            icon={template.icon}
                            title={template.title}
                            story={template.story}
                          />
                        );
                      })}
                    </div>
                  </GlassCard>
                )}

                {/* Resumen de Reserva — Glass Card */}
                <GlassCard className="p-5">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ClipboardList size={13} className="text-brand-500" />
                    {t('ota.showcase.bookingSummary')}
                  </h3>
                  <div className="space-y-4">
                    
                    {/* Fechas */}
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Clock size={10} /> {t('ota.showcase.stay')}
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {format(dateFrom, "dd MMM", { locale: dateLocale })} — {format(dateTo, "dd MMM", { locale: dateLocale })}
                        </p>
                      </div>
                      <div className="px-3 py-1.5 glass-card !rounded-[var(--radius-squircle-lg)]">
                        <span className="text-xs font-bold text-foreground/80">{nights} {t('ota.showcase.nights', { count: nights })}</span>
                      </div>
                    </div>

                    {/* Ocupacion */}
                    <div className="flex justify-between items-center pt-3 border-t border-border/40">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{t('ota.showcase.occupancy')}</p>
                        <p className="text-sm font-bold text-foreground">
                          {defaultGuests} {t('ota.showcase.guest', { count: defaultGuests })} (Capacidad máx: {room.capacity ?? 0})
                        </p>
                      </div>
                      <Users size={16} className="text-muted-foreground/40" />
                    </div>

                    {/* Alerta de capacidad */}
                    {isOverCapacity && (
                      <div className="flex flex-col gap-2 p-3 glass-card border-destructive/20 text-destructive">
                        <div className="flex gap-2">
                          <Info size={14} className="shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold mb-1">{t('ota.showcase.overCapacity')}</p>
                            <p className="text-[10px] leading-tight">
                              {t('ota.showcase.overCapacityDesc', { capacity: room.capacity ?? 0 })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-1 ml-6">
                          <button
                            onClick={() => { closeModal(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="text-[10px] font-bold underline underline-offset-2 hover:text-destructive/70 transition-colors"
                          >
                            {t('ota.showcase.adjustGuests')}
                          </button>
                          {hotel.rooms && hotel.rooms.some((r) => Number(r.capacity ?? 0) > Number(room.capacity ?? 0)) && (
                            <button
                              onClick={() => {
                                closeModal();
                                const section = document.getElementById('rooms-section');
                                if (section) section.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="text-[10px] font-bold text-brand-600 underline underline-offset-2 hover:text-brand-500 transition-colors"
                            >
                              {t('ota.showcase.seeLargerRooms')}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Desglose financiero */}
                    <div className="pt-3 border-t border-border/40">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-muted-foreground">{t('ota.showcase.baseRate')} ({nights} {t('ota.showcase.nights', { count: nights })})</span>
                        <span className="text-sm font-bold text-foreground">${totalPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-muted-foreground">{t('ota.showcase.taxesAndFees')}</span>
                        <span className="text-[10px] font-bold bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full uppercase">{t('ota.showcase.included')}</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>

              </div>
            </div>

            {/* Dock de cierre — barra flotante glass */}
            <div className="shrink-0 p-4">
              <div className="flex items-center justify-between px-5 py-4 glass-card">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-ultra mb-0.5">{t('ota.showcase.total')}</p>
                  <p className="text-xl font-black text-foreground">${totalPrice.toLocaleString()} <span className="text-xs font-medium text-muted-foreground">{t('ota.showcase.cop')}</span></p>
                </div>
                <button 
                  disabled={isOverCapacity}
                  onClick={handleCheckout}
                  className={cn(
                    "px-7 py-3.5 rounded-[var(--radius-squircle-lg)] font-semibold text-foreground transition-all flex items-center justify-center gap-2 active:scale-[0.97] shadow-cta",
                    isOverCapacity 
                      ? "bg-muted/60 text-muted-foreground cursor-not-allowed" 
      : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-cta hover:shadow-cta"
                  )}
                >
                  {isOverCapacity ? t('ota.showcase.adjustSearch') : t('ota.showcase.reserve')} <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* MOBILE/ TABLET STACKED (< lg) */}
        <div className="lg:hidden flex flex-col flex-1 overflow-hidden bg-gradient-to-b from-muted/80 to-background/60">
          
          {/* Galeria compacta */}
          <div className="shrink-0 p-2">
            <RoomGallery 
              images={images} 
              roomName={room.name ?? t('ota.showcase.fallbackRoom')} 
              onClose={closeModal}
              variant="compact"
            />
          </div>

          {/* Info scrolleable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
            <div className="px-4 py-5 space-y-5">
              
              {/* Nombre + Descripcion */}
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warm-500/10 backdrop-blur-xl border border-warm-500/20 text-warm-700 text-[10px] font-bold uppercase tracking-widest">
                  <Star size={11} className="fill-warm-500" /> {t('ota.showcase.authorsPick')}
                </span>
                <h2 className="text-2xl font-black text-foreground tracking-tight">{room.name}</h2>
                <p className="text-[15px] text-muted-foreground font-lora leading-relaxed italic">
                  {room.description || t('ota.showcase.fallbackDescription')}
                </p>
              </div>

              {/* Amenidades — Mobile: icon grid (compact). Desktop: full detail below. */}
              {room.amenities && room.amenities.length > 0 && (
                <GlassCard className="p-4">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-brand-400" />
                    {t('ota.showcase.amenities')}
                  </h3>
                  {/* Mobile: compact icon grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {room.amenities.map((amenity: string | { id: string; details?: string }, idx: number) => {
                        const id = typeof amenity === 'string' ? amenity : amenity.id;
                        const entry = getRoomAmenityById(id);
                        if (!entry) return null;
                        const template = entry.storyTitle
                          ? { icon: entry.icon, title: entry.storyTitle }
                          : { icon: entry.icon, title: entry.label };
                      return (
                        <AmenityGlass
                          key={idx}
                          icon={template.icon}
                          title={template.title}
                          story=""
                          compact
                        />
                      );
                    })}
                  </div>
                </GlassCard>
              )}

              {/* Resumen */}
              <GlassCard className="p-4">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ClipboardList size={13} className="text-brand-500" />
                  {t('ota.showcase.bookingSummary')}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={10} /> {t('ota.showcase.stay')}</p>
                      <p className="text-sm font-bold text-foreground">
                        {format(dateFrom, "dd MMM", { locale: dateLocale })} — {format(dateTo, "dd MMM", { locale: dateLocale })}
                      </p>
                    </div>
                    <div className="px-3 py-1.5 glass-card !rounded-[var(--radius-squircle-lg)]">
                      <span className="text-xs font-bold text-foreground/80">{nights} {t('ota.showcase.nights', { count: nights })}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-border/40">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{t('ota.showcase.occupancy')}</p>
                      <p className="text-sm font-bold text-foreground">
                        {defaultGuests} {t('ota.showcase.guest', { count: defaultGuests })} (Capacidad máx: {room.capacity ?? 0})
                      </p>
                    </div>
                    <Users size={16} className="text-muted-foreground/40" />
                  </div>
                  {isOverCapacity && (
                    <div className="flex flex-col gap-2 p-3 glass-card border-destructive/20 text-destructive">
                      <div className="flex gap-2">
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold mb-1">{t('ota.showcase.overCapacity')}</p>
                          <p className="text-[10px] leading-tight">{t('ota.showcase.overCapacityDescShort', { capacity: room.capacity ?? 0 })}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-1 ml-6">
                        <button
                          onClick={() => { closeModal(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="text-[10px] font-bold underline underline-offset-2 hover:text-destructive/70 transition-colors"
                        >
                          {t('ota.showcase.adjustGuests')}
                        </button>
                        {hotel.rooms && hotel.rooms.some((r) => Number(r.capacity ?? 0) > Number(room.capacity ?? 0)) && (
                          <button
                            onClick={() => {
                              closeModal();
                              const section = document.getElementById('rooms-section');
                              if (section) section.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="text-[10px] font-bold text-brand-600 underline underline-offset-2 hover:text-brand-500 transition-colors"
                          >
                            {t('ota.showcase.seeLargerRooms')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="pt-3 border-t border-border/40">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-muted-foreground">{t('ota.showcase.baseRate')} ({nights} {t('ota.showcase.nights', { count: nights })})</span>
                      <span className="text-sm font-bold text-foreground">${totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">{t('ota.showcase.taxesAndFees')}</span>
                      <span className="text-[10px] font-bold bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full uppercase">{t('ota.showcase.included')}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>

            </div>
          </div>

          {/* Dock de cierre mobile — glass flotante */}
          <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
            <div className="flex items-center justify-between px-5 py-4 glass-card">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-ultra mb-0.5">{t('ota.showcase.total')}</p>
                <p className="text-xl font-black text-foreground">${totalPrice.toLocaleString()} <span className="text-xs font-medium text-muted-foreground">{t('ota.showcase.cop')}</span></p>
              </div>
              <button 
                disabled={isOverCapacity}
                onClick={handleCheckout}
                className={cn(
                  "px-7 py-3.5 rounded-[var(--radius-squircle-lg)] font-semibold text-foreground transition-all flex items-center justify-center gap-2 active:scale-[0.97]",
                  isOverCapacity 
                    ? "bg-muted/60 text-muted-foreground cursor-not-allowed" 
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-cta hover:shadow-cta"
                )}
              >
                {isOverCapacity ? t('ota.showcase.adjust') : t('ota.showcase.reserve')} <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
