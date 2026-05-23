'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Edit3 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import AIPolicyAssistant from './AIPolicyAssistant';

export default function PaymentEditStep() {
  const t = useTranslations('onboarding.payment');
  const locale = useLocale();
  const { hotelIdentity, rooms, settings, updateSettings, updateHotelIdentity } = useOnboardingStore();
  const [editingField, setEditingField] = useState<string | null>(null);

  const minPrice = rooms.length > 0 ? Math.min(...rooms.map(r => r.price).filter(p => p > 0)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="space-y-8 max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <CreditCard className="mx-auto text-indigo-400" size={32} />
        <h3 className="text-2xl font-bold text-white">{t('editTitle') || t('title')}</h3>
        <p className="text-zinc-500 text-sm">{t('editSubtitle') || t('subtitle')}</p>
        {locale === 'en' && (
          <p className="text-zinc-600 text-xs italic">{t('englishLocaleNote')}</p>
        )}
      </div>

      {/* Property identity — editable */}
      <div className="bg-black/40 p-4 rounded-[var(--radius-squircle-xl)] border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{t('propertyLabel')}</p>
          <button onClick={() => setEditingField(editingField === 'identity' ? null : 'identity')} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <Edit3 size={12} />
          </button>
        </div>

        {editingField === 'identity' ? (
          <div className="space-y-2">
            <input
              type="text"
              value={hotelIdentity.name}
              onChange={(e) => updateHotelIdentity({ name: e.target.value })}
              className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-md)] p-2 text-white text-sm outline-none focus:border-indigo-500/50"
              placeholder={t('propertyNamePlaceholder')}
            />
            <input
              type="text"
              value={hotelIdentity.city}
              onChange={(e) => updateHotelIdentity({ city: e.target.value })}
              className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-md)] p-2 text-white text-sm outline-none focus:border-indigo-500/50"
              placeholder={t('cityLabel')}
            />
            <AIPolicyAssistant
              type="hotelDescription"
              context={{ propertyType: hotelIdentity.propertyType, cityName: hotelIdentity.city }}
              onAccept={(text) => updateHotelIdentity({ description: text })}
            />
          </div>
        ) : (
          <div>
            <p className="text-white font-bold text-base">{hotelIdentity.name || t('noName')}</p>
            <p className="text-zinc-500 text-sm">{hotelIdentity.city}{hotelIdentity.location ? `, ${hotelIdentity.location}` : ''}</p>
            <div className="flex gap-2 mt-2">
              <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded-[var(--radius-squircle-md)] border border-indigo-500/20 font-mono uppercase">{hotelIdentity.propertyType}</span>
              <span className="bg-zinc-500/10 text-zinc-400 text-[10px] px-2 py-0.5 rounded-[var(--radius-squircle-md)] border border-zinc-500/20 font-mono">{rooms.length} {locale === 'en' ? (rooms.length === 1 ? 'unit' : 'units') : (rooms.length === 1 ? 'unidad' : 'unidades')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Rooms summary */}
      {rooms.length > 0 && (
        <div className="bg-black/40 p-4 rounded-[var(--radius-squircle-xl)] border border-white/5 space-y-2">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{t('roomsLabel')}</p>
          {rooms.map(room => (
            <div key={room.id} className="flex items-center justify-between text-xs">
              <span className="text-zinc-300">{room.name || t('noName')}</span>
              <span className="text-emerald-400 font-mono">${room.price?.toLocaleString()}</span>
            </div>
          ))}
          {minPrice > 0 && (
            <div className="border-t border-white/5 pt-2 mt-2">
              <p className="text-[10px] text-zinc-600">{t('startingFrom')}</p>
              <p className="text-emerald-400 font-bold text-lg">${minPrice.toLocaleString()} <span className="text-xs font-normal text-zinc-500">{t('currencyLabel')}</span></p>
            </div>
          )}
        </div>
      )}

      {/* Cancellation policy — editable with AI */}
      <div className="bg-black/40 p-4 rounded-[var(--radius-squircle-xl)] border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{t('cancellationPolicyLabel')}</p>
          <button onClick={() => setEditingField(editingField === 'policy' ? null : 'policy')} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <Edit3 size={12} />
          </button>
        </div>

        {editingField === 'policy' ? (
          <div className="space-y-2">
            <textarea
              value={settings.cancellationPolicy || ''}
              onChange={(e) => updateSettings({ cancellationPolicy: e.target.value })}
              className="w-full bg-black/50 border border-white/5 rounded-[var(--radius-squircle-md)] p-2 text-xs text-zinc-300 outline-none focus:border-indigo-500/50 resize-none h-20"
              placeholder={t('cancellationPolicyPlaceholder')}
            />
            <AIPolicyAssistant
              type="cancellation"
              context={{
                propertyType: hotelIdentity.propertyType,
                checkInTime: settings.checkInTime,
                checkOutTime: settings.checkOutTime,
              }}
              onAccept={(text) => updateSettings({ cancellationPolicy: text })}
            />
          </div>
        ) : settings.cancellationPolicy ? (
          <p className="text-zinc-300 text-xs leading-relaxed">{settings.cancellationPolicy}</p>
        ) : (
          <p className="text-zinc-700 text-xs italic">{t('noPolicySet')}</p>
        )}
      </div>

      {/* Amenities */}
      {settings.amenities.length > 0 && (
        <div className="bg-black/40 p-4 rounded-[var(--radius-squircle-xl)] border border-white/5 space-y-2">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{t('amenitiesConfigured')}</p>
          <p className="text-zinc-400 text-sm">{t('amenitiesCount', { count: settings.amenities.length })}</p>
          <div className="flex flex-wrap gap-1">
            {settings.amenities.slice(0, 6).map(a => (
              <span key={a} className="bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded text-[10px]">{a}</span>
            ))}
            {settings.amenities.length > 6 && (
              <span className="text-zinc-600 text-[10px]">+{settings.amenities.length - 6}</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
