'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ChevronDown, ChevronUp, Clock, MessageCircle, Shield, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { ROOM_AMENITY_REGISTRY } from '@/lib/amenity-registry';
import AIPolicyAssistant from './AIPolicyAssistant';
import SuggestAmenity from './SuggestAmenity';

const springs = {
  medium: { type: 'spring' as const, stiffness: 300, damping: 24, mass: 1.0 },
};

type Section = 'hours' | 'policy' | 'amenities' | null;

export default function SettingsStep() {
  const t = useTranslations('onboarding.settings');
  const { settings, updateSettings } = useOnboardingStore();
  const [openSection, setOpenSection] = useState<Section>('hours');

  const toggleAmenity = (amenityId: string) => {
    const has = settings.amenities.includes(amenityId);
    updateSettings({ amenities: has ? settings.amenities.filter(a => a !== amenityId) : [...settings.amenities, amenityId] });
  };

  const toggleSection = (section: Section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const hotelIdentity = useOnboardingStore.getState().hotelIdentity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.medium}
      className="space-y-6 max-w-xl mx-auto"
    >
      {/* Header — 1 decisión por pantalla */}
      <div className="text-center space-y-2">
        <Settings className="mx-auto text-zinc-400" size={32} />
        <h3 className="text-2xl font-bold text-white">{t('title')}</h3>
        <p className="text-zinc-500 text-sm">{t('subtitle')}</p>
      </div>

      {/* Section 1: Horarios y contacto */}
      <SectionCard
        icon={Clock}
        title={t('checkInLabel').replace('Check-in', 'Horarios')}
        isOpen={openSection === 'hours'}
        onToggle={() => toggleSection('hours')}
      >
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
        <div className="mt-4">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('whatsappLabel')}</label>
          <input type="text" value={settings.whatsappNumber || ''} onChange={(e) => updateSettings({ whatsappNumber: e.target.value })} placeholder={t('whatsappPlaceholder')} className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 text-white outline-none focus:border-indigo-500/50 placeholder:text-zinc-700" />
        </div>
      </SectionCard>

      {/* Section 2: Políticas */}
      <SectionCard
        icon={Shield}
        title={t('cancellationPolicyLabel')}
        isOpen={openSection === 'policy'}
        onToggle={() => toggleSection('policy')}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{t('draftYourPolicy')}</p>
          <AIPolicyAssistant
            type="cancellation"
            context={{
              propertyType: hotelIdentity.propertyType,
              checkInTime: settings.checkInTime,
              checkOutTime: settings.checkOutTime,
            }}
            onAccept={(text) => updateSettings({ cancellationPolicy: text })}
            hotelName={hotelIdentity.name}
          />
        </div>
        <textarea value={settings.cancellationPolicy || ''} onChange={(e) => updateSettings({ cancellationPolicy: e.target.value })} placeholder={t('cancellationPolicyPlaceholder')} className="w-full bg-black/40 border border-white/5 rounded-[var(--radius-squircle-lg)] p-3 text-sm text-zinc-300 outline-none focus:border-indigo-500/50 resize-none h-24 placeholder:text-zinc-700" />
      </SectionCard>

      {/* Section 3: Amenidades */}
      <SectionCard
        icon={Sparkles}
        title={t('hotelAmenitiesLabel')}
        isOpen={openSection === 'amenities'}
        onToggle={() => toggleSection('amenities')}
        badge={settings.amenities.length > 0 ? `${settings.amenities.length}` : undefined}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{t('selectAvailable')}</p>
          <SuggestAmenity hotelName={hotelIdentity.name} />
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.values(ROOM_AMENITY_REGISTRY).map(amenity => {
            const isActive = settings.amenities.includes(amenity.id);
            const Icon = amenity.icon;
            return (
              <motion.button
                key={amenity.id}
                onClick={() => toggleAmenity(amenity.id)}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-squircle-md)] text-xs font-medium transition-all border ${
                  isActive
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
                }`}
              >
                <Icon size={14} /> {amenity.label}
              </motion.button>
            );
          })}
        </div>
      </SectionCard>
    </motion.div>
  );
}

// ============================================================================
// Collapsible Section Card — progressive disclosure
// ============================================================================

function SectionCard({
  icon: Icon,
  title,
  isOpen,
  onToggle,
  children,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="bg-black/30 border border-white/5 rounded-[var(--radius-squircle-xl)] overflow-hidden">
      <motion.button
        onClick={onToggle}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={16} className="text-zinc-500" />
          <span className="text-sm font-bold text-white">{title}</span>
          {badge && (
            <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-mono">{badge}</span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={springs.medium}
        >
          <ChevronDown size={16} className="text-zinc-600" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springs.medium}
          >
            <div className="p-4 pt-0 border-t border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
