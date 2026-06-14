'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ChevronDown, Clock, Shield, Sparkles, Banknote, CreditCard, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { AMENITY_REGISTRY } from '@/lib/amenity-registry';
import AIPolicyAssistant from './AIPolicyAssistant';
import SuggestAmenity from './SuggestAmenity';

const springs = {
  medium: { type: 'spring' as const, stiffness: 300, damping: 24, mass: 1.0 },
};

type Section = 'hours' | 'policy' | 'amenities' | 'tax' | 'wompi' | null;

export default function SettingsStep() {
  const t = useTranslations('onboarding.settings');
  const { settings, updateSettings } = useOnboardingStore();
  const [openSection, setOpenSection] = useState<Section>('hours');
  const [showSecret, setShowSecret] = useState(false);

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
          {Object.values(AMENITY_REGISTRY).map(amenity => {
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

      {/* Section 4: Régimen Tributario */}
      <SectionCard
        icon={Banknote}
        title="Régimen Tributario"
        isOpen={openSection === 'tax'}
        onToggle={() => toggleSection('tax')}
      >
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">
          Selecciona tu régimen fiscal
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateSettings({ taxRate: 0 })}
            className={`p-4 rounded-[var(--radius-squircle-lg)] border text-left transition-all ${
              settings.taxRate === 0
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
            }`}
          >
            <p className="text-sm font-bold text-white">Simplificado</p>
            <p className="text-[10px] text-zinc-500 mt-1">Sin IVA en precios</p>
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ taxRate: 0.19 })}
            className={`p-4 rounded-[var(--radius-squircle-lg)] border text-left transition-all ${
              settings.taxRate === 0.19
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
            }`}
          >
            <p className="text-sm font-bold text-white">Ordinario</p>
            <p className="text-[10px] text-zinc-500 mt-1">IVA 19% incluido</p>
          </button>
        </div>
      </SectionCard>

      {/* Section 5: Pasarela de Pagos (Soberanía Financiera) */}
      <SectionCard
        icon={CreditCard}
        title="Pasarela de Pagos"
        isOpen={openSection === 'wompi'}
        onToggle={() => toggleSection('wompi')}
        badge={settings.wompi_public_key && settings.wompi_integrity_secret ? '✓' : undefined}
      >
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">
          Conecta tu cuenta de Wompi para recibir pagos directos
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">
              Clave Pública (Public Key)
            </label>
            <input
              type="text"
              value={settings.wompi_public_key || ''}
              onChange={(e) => updateSettings({ wompi_public_key: e.target.value })}
              placeholder="pub_prod_..."
              className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 text-white outline-none focus:border-indigo-500/50 placeholder:text-zinc-700 font-mono text-sm"
            />
          </div>
          <div className="relative">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">
              Secreto de Integridad (Integrity Secret)
            </label>
            <input
              type={showSecret ? 'text' : 'password'}
              value={settings.wompi_integrity_secret || ''}
              onChange={(e) => updateSettings({ wompi_integrity_secret: e.target.value })}
              placeholder="integ_..."
              className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 pr-10 text-white outline-none focus:border-indigo-500/50 placeholder:text-zinc-700 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-[34px] text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label={showSecret ? 'Ocultar clave' : 'Mostrar clave'}
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[10px] text-zinc-600 leading-relaxed">
            Obtén estas claves en tu <span className="text-zinc-400">Dashboard de Wompi → Desarrollo → Integración</span>.
            Si no las tienes aún, puedes activar tu cuenta y configurarlas después.
          </p>
          
          {/* Toggle: Modo de Prueba */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Modo de Prueba</p>
              <p className="text-[10px] text-zinc-500">Activa para hacer cobros de prueba sin riesgo</p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ wompi_sandbox_mode: !settings.wompi_sandbox_mode })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.wompi_sandbox_mode ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.wompi_sandbox_mode ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
          {settings.wompi_sandbox_mode && (
            <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">
              ⚠️ Estás en modo de prueba. No uses tarjetas reales.
            </p>
          )}
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
