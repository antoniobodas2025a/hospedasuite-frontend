'use client';

import { motion } from 'framer-motion';
import { Building2, Tent, Home, Hotel, Warehouse } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { PropertyType } from '@/lib/room-templates';

const typeIcons: Record<PropertyType, typeof Building2> = {
  hotel: Hotel,
  glamping: Tent,
  cabanas: Home,
  hostal: Warehouse,
  apartamento: Building2,
};

const springs = {
  medium: { type: 'spring' as const, stiffness: 300, damping: 24, mass: 1.0 },
};

export default function PropertyTypeStep() {
  const t = useTranslations('onboarding.propertyType');
  const { hotelIdentity, updateHotelIdentity } = useOnboardingStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.medium}
      className="space-y-8 max-w-xl mx-auto"
    >
      {/* 1 decisión por pantalla */}
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-white">{t('title')}</h3>
        <p className="text-zinc-500 text-sm">{t('subtitle')}</p>
      </div>

      <div className="grid gap-3">
        {(['hotel', 'glamping', 'cabanas', 'hostal', 'apartamento'] as const).map(type => {
          const Icon = typeIcons[type];
          const isSelected = hotelIdentity.propertyType === type;
          return (
            <motion.button
              key={type}
              onClick={() => updateHotelIdentity({ propertyType: type })}
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
              layout
              className={`flex items-center gap-4 p-5 rounded-[var(--radius-squircle-xl)] border transition-all text-left ${
                isSelected
                  ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/20'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <div className={`p-3 rounded-[var(--radius-squircle-lg)] ${isSelected ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
                <Icon size={24} className={isSelected ? 'text-indigo-400' : 'text-zinc-500'} />
              </div>
              <div>
                <p className={`font-bold text-sm uppercase tracking-wider ${isSelected ? 'text-indigo-300' : 'text-zinc-300'}`}>{type}</p>
                <p className="text-xs text-zinc-500 mt-1">{t(`descriptions.${type}`)}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
