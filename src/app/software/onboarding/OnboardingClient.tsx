'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import StepIndicator from '@/components/onboarding/StepIndicator';
import HotelIdentityStep from '@/components/onboarding/HotelIdentityStep';
import PropertyGalleryStep from '@/components/onboarding/PropertyGalleryStep';
import PropertyTypeStep from '@/components/onboarding/PropertyTypeStep';
import RoomTemplatesStep from '@/components/onboarding/RoomTemplatesStep';
import SettingsStep from '@/components/onboarding/SettingsStep';
import PaymentStep from '@/components/onboarding/PaymentStep';
import ProvisioningStep from '@/components/onboarding/ProvisioningStep';

const STEPS = [
  { number: 1, label: 'Identidad' },
  { number: 2, label: 'Galería' },
  { number: 3, label: 'Tipo' },
  { number: 4, label: 'Unidades' },
  { number: 5, label: 'Config' },
  { number: 6, label: 'Activar' },
];

const slideVariants = {
  enter: { x: 20, opacity: 0 },
  center: { x: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  exit: { x: -20, opacity: 0, transition: { duration: 0.15 } },
};

export default function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { currentStep, maxCompletedStep, setCurrentStep, setMaxCompletedStep, setHotelId, setPaymentInfo, paymentTransactionId } = useOnboardingStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve context on mount
  useEffect(() => {
    async function fetchContext() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) { router.push('/login'); return; }

        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select('hotel_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (staffError || !staff) {
          setError('No se detectó una propiedad vinculada a tu cuenta.');
        } else {
          setHotelId(staff.hotel_id);
        }

        // Read plan/price from query params
        const plan = searchParams.get('plan');
        const price = searchParams.get('price');
        if (price) {
          setPaymentInfo(plan, Number(price));
        }
      } catch {
        setError('Error de conexión.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchContext();
  }, []);

  const canProceed = currentStep <= maxCompletedStep + 1;
  const isLastStep = currentStep === 6;

  const handleNext = () => {
    if (currentStep < 6) {
      setMaxCompletedStep(Math.max(maxCompletedStep, currentStep));
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    if (step <= maxCompletedStep + 1) {
      setCurrentStep(step);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center space-y-6">
      <Loader2 className="animate-spin text-indigo-500 size-16" />
      <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">Cargando</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="text-rose-500 size-20 mb-6" />
      <h2 className="text-white font-bold text-3xl mb-3">Error de Conexión</h2>
      <p className="text-zinc-500 mb-6">{error}</p>
      <button onClick={() => window.location.reload()} className="px-10 py-4 bg-zinc-900 border border-white/10 rounded-[var(--radius-squircle-2xl)] text-white font-bold hover:bg-white/5 transition-all">Reintentar</button>
    </div>
  );

  // Step 6 with payment → provisioning
  if (currentStep === 6 && paymentTransactionId) {
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
        {/* Header */}
        <div className="text-center mb-12">
          <div className="glass-card w-16 h-16 flex items-center justify-center mx-auto mb-6 shadow-2xl ring-1 ring-white/5">
            <Building2 className="text-indigo-400" size={28} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white uppercase tracking-widest">HospedaSuite</h2>
          <p className="text-zinc-500 text-sm mt-2">Configurá tu propiedad en 6 pasos simples</p>
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
            {currentStep === 6 && <PaymentStep key="step6" />}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        {currentStep < 6 && (
          <div className="flex gap-4 mt-8">
            {currentStep > 1 && (
              <button onClick={handleBack} className="w-1/3 border border-white/10 text-zinc-500 py-4 rounded-[var(--radius-squircle-xl)] font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all">
                Atrás
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`${currentStep === 1 ? 'w-full' : 'w-2/3'} bg-indigo-600 text-white font-bold py-4 rounded-[var(--radius-squircle-xl)] uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 disabled:opacity-20 transition-all`}
            >
              {isLastStep ? 'Activar' : 'Siguiente'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
