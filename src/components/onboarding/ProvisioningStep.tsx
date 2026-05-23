'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, CheckCircle2, AlertCircle, ExternalLink, LayoutDashboard, Globe, Copy, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { executeOnboardingProvisioning } from '@/app/actions/onboarding';
import { fullWizardStateSchema } from '@/lib/onboarding-schemas';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function ProvisioningStep() {
  const t = useTranslations('onboarding.provisioning');
  const router = useRouter();
  const { hotelIdentity, galleryPreviews, rooms, settings, paymentTransactionId, reset } = useOnboardingStore();
  const [status, setStatus] = useState<'provisioning' | 'success' | 'error'>('provisioning');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hotelSlug, setHotelSlug] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    async function provision() {
      if (!paymentTransactionId) {
        setStatus('error');
        setErrorMessage(t('noTransaction'));
        return;
      }

      const wizardState = {
        hotelIdentity,
        galleryImages: galleryPreviews,
        rooms: rooms.map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          price: r.price,
          description: r.description,
          amenities: r.amenities,
          capacity: r.capacity,
          beds: r.beds,
          imageUrls: r.imagePreviews,
          availabilityRange: null,
        })),
        settings,
        payment: {
          planId: undefined,
          price: 89900,
          transactionId: paymentTransactionId,
        },
      };

      const result = fullWizardStateSchema.safeParse(wizardState);
      if (!result.success) {
        console.error('🔍 Validation errors:', result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })));
        setStatus('error');
        setErrorMessage(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n'));
        return;
      }

      const provisioningResult = await executeOnboardingProvisioning(result.data);
      
      if (provisioningResult.success) {
        const slug = generateSlug(hotelIdentity.name);
        setHotelSlug(slug);
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(provisioningResult.error || t('errorTitle'));
      }
    }

    provision();
  }, [paymentTransactionId]);

  // --------------------------------------------------------------------------
  // PROVISIONING STATE
  // --------------------------------------------------------------------------
  if (status === 'provisioning') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center space-y-8">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin" />
          <div className="absolute inset-2 border-r-2 border-emerald-500 rounded-full animate-spin direction-reverse duration-1000" />
          <Building2 className="absolute inset-0 m-auto text-white/50" size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white uppercase tracking-widest">{t('activating')}</h3>
          <p className="text-zinc-500 text-xs font-mono">{t('configuring')}</p>
        </div>
      </motion.div>
    );
  }

  // --------------------------------------------------------------------------
  // ERROR STATE
  // --------------------------------------------------------------------------
  if (status === 'error') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center space-y-8">
        <AlertCircle className="mx-auto text-rose-500" size={64} />
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white uppercase tracking-widest">{t('errorTitle')}</h3>
          <p className="text-zinc-400 text-sm whitespace-pre-line">{errorMessage}</p>
          <button
            onClick={() => router.back()}
            className="px-8 py-3 bg-zinc-800 border border-white/10 rounded-[var(--radius-squircle-xl)] text-white font-bold hover:bg-zinc-700 transition-colors"
          >
            {t('retry')}
          </button>
        </div>
      </motion.div>
    );
  }

  // --------------------------------------------------------------------------
  // SUCCESS STATE — Mac 2026: Progressive disclosure, single decision per screen
  // Chunk 1: Confirmation + Hotel identity
  // Chunk 2: Access links (OTA page + Dashboard)
  // Chunk 3: Credentials (email used for auth)
  // --------------------------------------------------------------------------
  const hotelUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/hotel/${hotelSlug}`;
  const dashboardUrl = '/admin/dashboard';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24, mass: 1.0 }}
      className="py-12 space-y-10 max-w-lg mx-auto"
    >
      {/* Chunk 1: Confirmation — Saliencia visual en el check */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
          className="relative w-20 h-20 mx-auto"
        >
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="text-emerald-400" size={36} />
          </div>
        </motion.div>
        <h3 className="text-2xl font-black text-white tracking-tight">{t('success')}</h3>
        <p className="text-zinc-400 text-sm">{hotelIdentity.name} está activa y lista para recibir reservas.</p>
      </div>

      {/* Chunk 2: Hotel identity card — Glassmorphism 2.0 */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-squircle-lg)] bg-gradient-to-br from-brand-500 to-warm-600 flex items-center justify-center text-white font-black text-lg shrink-0">
            {hotelIdentity.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{hotelIdentity.name}</p>
            <p className="text-zinc-500 text-xs">{hotelIdentity.city}</p>
          </div>
        </div>

        {/* Slug — copyable */}
        <div className="flex items-center justify-between bg-black/30 rounded-[var(--radius-squircle-lg)] px-3 py-2 border border-white/5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Slug público</p>
            <p className="text-zinc-300 text-xs font-mono truncate">{hotelSlug}</p>
          </div>
          <button
            onClick={() => copyToClipboard(hotelSlug || '', 'slug')}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            {copiedField === 'slug' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-zinc-400" />}
          </button>
        </div>
      </div>

      {/* Chunk 3: Access links — Ley de Hick: 2 opciones claras, no más */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Acceso rápido</p>
        
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => { reset(); router.push(hotelUrl); }}
          className="w-full flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-[var(--radius-squircle-xl)] hover:bg-white/10 hover:border-brand-500/30 transition-all group"
        >
          <div className="w-9 h-9 rounded-[var(--radius-squircle-lg)] bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
            <Globe size={16} className="text-brand-400" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-white text-sm font-bold">Ver página pública</p>
            <p className="text-zinc-500 text-xs truncate">{hotelUrl}</p>
          </div>
          <ExternalLink size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => { reset(); router.push(dashboardUrl); }}
          className="w-full flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-[var(--radius-squircle-xl)] hover:bg-white/10 hover:border-indigo-500/30 transition-all group"
        >
          <div className="w-9 h-9 rounded-[var(--radius-squircle-lg)] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <LayoutDashboard size={16} className="text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="text-white text-sm font-bold">Ir al Dashboard</p>
            <p className="text-zinc-500 text-xs">Administrar reservas, tarifas y OTAs</p>
          </div>
          <ExternalLink size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
        </motion.button>
      </div>

      {/* Chunk 4: Credentials — Progressive disclosure */}
      <div className="text-center space-y-2">
        <p className="text-zinc-600 text-xs">
          Usá el email con el que te registraste para acceder al dashboard.
        </p>
      </div>
    </motion.div>
  );
}
