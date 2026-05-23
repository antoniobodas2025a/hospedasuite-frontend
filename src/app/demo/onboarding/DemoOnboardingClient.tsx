'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Play, ArrowLeft, Sparkles } from 'lucide-react';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import StepIndicator from '@/components/onboarding/StepIndicator';
import HotelIdentityStep from '@/components/onboarding/HotelIdentityStep';
import PropertyGalleryStep from '@/components/onboarding/PropertyGalleryStep';
import PropertyTypeStep from '@/components/onboarding/PropertyTypeStep';
import RoomTemplatesStep from '@/components/onboarding/RoomTemplatesStep';
import SettingsStep from '@/components/onboarding/SettingsStep';
import PaymentEditStep from '@/components/onboarding/PaymentEditStep';
import PaymentStep from '@/components/onboarding/PaymentStep';
import PaymentReviewStep from '@/components/onboarding/PaymentReviewStep';
import ProvisioningStep from '@/components/onboarding/ProvisioningStep';

const slideVariants = {
  enter: { x: 20, opacity: 0 },
  center: { x: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24, mass: 1.0 } },
  exit: { x: -20, opacity: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 } },
};

const DEMO_HOTEL = {
  name: 'Patio del Mundo',
  city: 'Cartagena',
  location: 'Getsemaní',
  propertyType: 'hotel' as const,
  description: 'Hotel boutique en el corazón de Getsemaní',
};

const DEMO_SETTINGS = {
  amenities: ['Wifi', 'Aire acondicionado', 'Agua caliente', 'Desayuno incluido', 'Piscina'],
  checkInTime: '15:00',
  checkOutTime: '11:00',
  cancellationPolicy: 'Cancelación gratuita hasta 48 horas antes del check-in.',
};

export default function DemoOnboarding() {
  const t = useTranslations();
  const router = useRouter();
  const {
    currentStep, maxCompletedStep, setCurrentStep, setMaxCompletedStep,
    setPaymentInfo, setPaymentTransactionId, paymentTransactionId, isProvisioning,
    manualReceiptUrl,
    updateHotelIdentity, updateSettings, addRoomFromTemplate,
  } = useOnboardingStore();

  const [isSeeded, setIsSeeded] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const STEPS = [
    { number: 1, label: t('onboarding.steps.identity') },
    { number: 2, label: t('onboarding.steps.gallery') },
    { number: 3, label: t('onboarding.steps.type') },
    { number: 4, label: t('onboarding.steps.units') },
    { number: 5, label: t('onboarding.steps.config') },
    { number: 6, label: t('onboarding.steps.review') || 'Revisar' },
    { number: 7, label: t('onboarding.steps.pay') || 'Pago' },
    { number: 8, label: t('onboarding.steps.activate') },
  ];

  // Seed demo data on mount
  useEffect(() => {
    if (isSeeded) return;

    updateHotelIdentity(DEMO_HOTEL);
    updateSettings(DEMO_SETTINGS);
    setPaymentInfo('pro', 99000);

    // Seed 2 demo rooms
    addRoomFromTemplate('hotel', 'standard');
    addRoomFromTemplate('hotel', 'suite');

    // Mark all steps as completable for free navigation
    setMaxCompletedStep(8);
    setCurrentStep(1);

    setIsSeeded(true);
  }, [isSeeded]);

  const handleNext = () => {
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
  };

  const handleStartDemo = () => {
    setShowIntro(false);
  };

  // Intro screen
  if (showIntro) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
        <div className="fixed top-[-20%] left-[-10%] w-[80%] h-[80%] bg-indigo-600/10 blur-[180px] rounded-full pointer-events-none" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/5 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-lg w-full mx-auto relative z-10 text-center space-y-8">
          {/* DEMO Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">Modo Demo</span>
          </div>

          <div className="glass-card w-20 h-20 flex items-center justify-center mx-auto shadow-2xl ring-1 ring-white/5">
            <Building2 className="text-indigo-400" size={36} />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight text-white uppercase tracking-widest">
              HospedaSuite
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Configurá tu propiedad en 7 pasos simples.
              <br />
              <span className="text-zinc-600 text-sm">Datos de ejemplo precargados — sin registro necesario.</span>
            </p>
          </div>

          <motion.button
            onClick={handleStartDemo}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white font-bold rounded-[var(--radius-squircle-xl)] shadow-lg shadow-indigo-600/20 text-sm uppercase tracking-widest"
          >
            <Play size={16} />
            Iniciar Demo
          </motion.button>

          <button
            onClick={() => router.push('/software')}
            className="flex items-center gap-2 mx-auto text-zinc-600 hover:text-zinc-400 transition-colors text-sm"
          >
            <ArrowLeft size={14} />
            Volver al sitio
          </button>
        </div>
      </div>
    );
  }

  // Provisioning — triggered by PaymentReviewStep (step 8) via startProvisioning()
  if (isProvisioning && (paymentTransactionId || manualReceiptUrl)) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col justify-center py-12 px-4 relative overflow-hidden">
        <div className="fixed top-[-20%] left-[-10%] w-[80%] h-[80%] bg-indigo-600/10 blur-[180px] rounded-full pointer-events-none" />
        <div className="max-w-4xl w-full mx-auto relative z-10">
          <ProvisioningStep />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col justify-center py-12 px-4 relative overflow-hidden">
      <div className="fixed top-[-20%] left-[-10%] w-[80%] h-[80%] bg-indigo-600/10 blur-[180px] rounded-full pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto relative z-10">
        {/* DEMO Banner */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Sparkles size={12} className="text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Demo — Datos de ejemplo</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="glass-card w-16 h-16 flex items-center justify-center mx-auto mb-6 shadow-2xl ring-1 ring-white/5">
            <Building2 className="text-indigo-400" size={28} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white uppercase tracking-widest">HospedaSuite</h2>
          <p className="text-zinc-500 text-sm mt-2">Configurá tu propiedad en 7 pasos simples</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} maxCompletedStep={maxCompletedStep} steps={STEPS} onStepClick={handleStepClick} />

        {/* Step Content */}
        <div className="glass-panel p-8 md:p-12 relative overflow-hidden ring-1 ring-inset ring-white/5">
          <AnimatePresence mode="wait">
            {currentStep === 1 && <HotelIdentityStep key="step1" />}
            {currentStep === 2 && <PropertyGalleryStep key="step2" />}
            {currentStep === 3 && <PropertyTypeStep key="step3" />}
            {currentStep === 4 && <RoomTemplatesStep key="step4" />}
            {currentStep === 5 && <SettingsStep key="step5" />}
            {currentStep === 6 && <PaymentEditStep key="step6" />}
            {currentStep === 7 && <PaymentStep key="step7" />}
            {currentStep === 8 && <PaymentReviewStep key="step8" />}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        {currentStep < 9 && (
          <div className="mt-8 space-y-3">
            <div className="flex gap-4">
              {currentStep > 1 && (
                <motion.button
                  onClick={handleBack}
                  whileTap={{ scale: 0.97 }}
                  className="w-1/3 border border-white/10 text-zinc-500 py-4 rounded-[var(--radius-squircle-xl)] font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all"
                >
                  Atrás
                </motion.button>
              )}
              <motion.button
                onClick={handleNext}
                whileTap={{ scale: 0.97 }}
                className={`${currentStep === 1 ? 'w-full' : 'w-2/3'} bg-indigo-600 text-white font-bold py-4 rounded-[var(--radius-squircle-xl)] uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 transition-all`}
              >
                {currentStep === 6 ? 'Ir al Pago' : 'Siguiente'}
              </motion.button>
            </div>
          </div>
        )}

        {/* Back to site */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/software')}
            className="flex items-center gap-2 mx-auto text-zinc-700 hover:text-zinc-500 transition-colors text-xs"
          >
            <ArrowLeft size={12} />
            Salir de la demo
          </button>
        </div>
      </div>
    </div>
  );
}
