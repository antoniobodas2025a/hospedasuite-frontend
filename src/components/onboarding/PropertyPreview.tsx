'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star, Eye } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function PropertyPreview() {
  const t = useTranslations();
  const locale = useLocale();
  const { hotelIdentity, rooms, settings, galleryPreviews, logoPreview } = useOnboardingStore();
  const [isFlipped, setIsFlipped] = useState(false);

  const minPrice = rooms.length > 0 ? Math.min(...rooms.map(r => r.price).filter(p => p > 0)) : 0;
  const coverImage = galleryPreviews[0] || 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=640';

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <button
        onClick={() => setIsFlipped(!isFlipped)}
        className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-400 transition-colors"
      >
        <Eye size={12} />
        {isFlipped ? t('propertyPreview.adminView') : t('propertyPreview.guestView')}
      </button>

      {isFlipped ? (
        /* Guest-facing preview (HotelCard style) */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="group relative aspect-[4/5] rounded-[var(--radius-squircle-2xl)] overflow-hidden shadow-lg bg-zinc-900"
        >
          {/* Cover image */}
          <img
            src={coverImage}
            alt={hotelIdentity.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="text-lg font-bold leading-tight mb-1">
              {hotelIdentity.name || 'Sin nombre'}
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-white/80 mb-2">
              <MapPin size={10} />
              {hotelIdentity.city}{hotelIdentity.location ? `, ${hotelIdentity.location}` : ''}
            </div>

            {settings.cancellationPolicy && (
              <p className="text-[10px] text-white/60 leading-snug line-clamp-2 mb-2">
                {settings.cancellationPolicy}
              </p>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
              <div>
                <span className="text-[8px] text-white/60 uppercase">Desde</span>
                <div className="text-sm font-bold">
                  ${minPrice.toLocaleString()}
                  <span className="text-[10px] font-normal text-white/60"> /noche</span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2 py-1 rounded-[var(--radius-squircle-md)] border border-white/20">
                <Star size={10} className="text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] font-bold">Nuevo</span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Admin-facing summary (data cards) */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="space-y-3"
        >
          {/* Identity card */}
          <div className="bg-black/40 p-4 rounded-[var(--radius-squircle-xl)] border border-white/5 space-y-2">
            {logoPreview && (
              <img src={logoPreview} alt="Logo" className="h-8 object-contain mb-2" />
            )}
            <p className="text-white font-bold text-base">{hotelIdentity.name || 'Sin nombre'}</p>
            <p className="text-zinc-500 text-xs">{hotelIdentity.city}{hotelIdentity.location ? `, ${hotelIdentity.location}` : ''}</p>
            <div className="flex gap-2">
              <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded-[var(--radius-squircle-md)] border border-indigo-500/20 font-mono uppercase">{hotelIdentity.propertyType}</span>
              <span className="bg-zinc-500/10 text-zinc-400 text-[10px] px-2 py-0.5 rounded-[var(--radius-squircle-md)] border border-zinc-500/20 font-mono">{rooms.length} {rooms.length === 1 ? 'unidad' : 'unidades'}</span>
            </div>
          </div>

          {/* Rooms summary */}
          {rooms.length > 0 && (
            <div className="bg-black/40 p-4 rounded-[var(--radius-squircle-xl)] border border-white/5 space-y-2">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Habitaciones</p>
              {rooms.map(room => (
                <div key={room.id} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">{room.name || 'Sin nombre'}</span>
                  <span className="text-emerald-400 font-mono">${room.price?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Policies & amenities */}
          <div className="bg-black/40 p-4 rounded-[var(--radius-squircle-xl)] border border-white/5 space-y-2">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Configuración</p>
            {settings.checkInTime && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Check-in / Check-out</span>
                <span className="text-zinc-300">{settings.checkInTime} / {settings.checkOutTime}</span>
              </div>
            )}
            {settings.cancellationPolicy && (
              <div className="text-xs">
                <span className="text-zinc-500 block mb-1">Política de cancelación</span>
                <span className="text-zinc-300 text-[11px] leading-relaxed">{settings.cancellationPolicy}</span>
              </div>
            )}
            {settings.amenities.length > 0 && (
              <div className="text-xs">
                <span className="text-zinc-500 block mb-1">Amenities ({settings.amenities.length})</span>
                <div className="flex flex-wrap gap-1">
                  {settings.amenities.slice(0, 5).map(a => (
                    <span key={a} className="bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded text-[10px]">{a}</span>
                  ))}
                  {settings.amenities.length > 5 && (
                    <span className="text-zinc-600 text-[10px]">+{settings.amenities.length - 5}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
