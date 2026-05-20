'use client';

import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { ROOM_AMENITY_REGISTRY } from '@/lib/amenity-registry';

export default function SettingsStep() {
  const t = useTranslations('onboarding.settings');
  const { settings, updateSettings } = useOnboardingStore();

  const toggleAmenity = (amenityId: string) => {
    const has = settings.amenities.includes(amenityId);
    updateSettings({ amenities: has ? settings.amenities.filter(a => a !== amenityId) : [...settings.amenities, amenityId] });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-xl mx-auto">
      <div className="text-center space-y-2">
        <Settings className="mx-auto text-zinc-400" size={32} />
        <h3 className="text-2xl font-bold text-white">{t('title')}</h3>
        <p className="text-zinc-500 text-sm">{t('subtitle')}</p>
      </div>

      <div className="space-y-6">
        {/* Check-in/out */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('checkInLabel')}</label>
            <input type="time" value={settings.checkInTime || '15:00'} onChange={(e) => updateSettings({ checkInTime: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 text-white outline-none focus:border-indigo-500/50" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('checkOutLabel')}</label>
            <input type="time" value={settings.checkOutTime || '11:00'} onChange={(e) => updateSettings({ checkOutTime: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 text-white outline-none focus:border-indigo-500/50" />
          </div>
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('whatsappLabel')}</label>
          <input type="text" value={settings.whatsappNumber || ''} onChange={(e) => updateSettings({ whatsappNumber: e.target.value })} placeholder={t('whatsappPlaceholder')} className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 text-white outline-none focus:border-indigo-500/50 placeholder:text-zinc-700" />
        </div>

        {/* Cancellation Policy */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('cancellationPolicyLabel')}</label>
          <textarea value={settings.cancellationPolicy || ''} onChange={(e) => updateSettings({ cancellationPolicy: e.target.value })} placeholder={t('cancellationPolicyPlaceholder')} className="w-full bg-black/40 border border-white/5 rounded-[var(--radius-squircle-lg)] p-3 text-sm text-zinc-300 outline-none focus:border-indigo-500/50 resize-none h-24 placeholder:text-zinc-700" />
        </div>

        {/* Hotel Amenities */}
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">{t('hotelAmenitiesLabel')}</p>
          <div className="flex flex-wrap gap-2">
            {Object.values(ROOM_AMENITY_REGISTRY).map(amenity => {
              const isActive = settings.amenities.includes(amenity.id);
              const Icon = amenity.icon;
              return (
                <button key={amenity.id} onClick={() => toggleAmenity(amenity.id)} className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-squircle-md)] text-xs font-medium transition-all border ${isActive ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'}`}>
                  <Icon size={14} /> {amenity.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
