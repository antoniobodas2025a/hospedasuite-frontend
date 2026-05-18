'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { executeOnboardingProvisioning } from '@/app/actions/onboarding';
import { fullWizardStateSchema } from '@/lib/onboarding-schemas';

export default function ProvisioningStep() {
  const router = useRouter();
  const { hotelIdentity, galleryPreviews, rooms, settings, paymentTransactionId, setError, reset } = useOnboardingStore();
  const [status, setStatus] = useState<'provisioning' | 'success' | 'error'>('provisioning');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function provision() {
      if (!paymentTransactionId) {
        setStatus('error');
        setErrorMessage('No se encontró el ID de transacción');
        return;
      }

      // Build full state for validation
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
          imageUrls: r.imagePreviews, // Use preview URLs for now
          availabilityRange: null,
        })),
        settings,
        payment: {
          planId: undefined, // undefined instead of null to match Zod .optional()
          price: 89900,
          transactionId: paymentTransactionId,
        },
      };

      // Validate
      const result = fullWizardStateSchema.safeParse(wizardState);
      if (!result.success) {
        setStatus('error');
        setErrorMessage(`Datos inválidos: ${result.error.issues[0]?.message}`);
        return;
      }

      // Execute provisioning
      const provisioningResult = await executeOnboardingProvisioning(result.data);
      
      if (provisioningResult.success) {
        setStatus('success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage(provisioningResult.error || 'Error desconocido');
      }
    }

    provision();
  }, [paymentTransactionId]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center space-y-8">
      {status === 'provisioning' && (
        <>
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin" />
            <div className="absolute inset-2 border-r-2 border-emerald-500 rounded-full animate-spin direction-reverse duration-1000" />
            <Building2 className="absolute inset-0 m-auto text-white/50" size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white uppercase tracking-widest">Activando tu Propiedad</h3>
            <p className="text-zinc-500 text-xs font-mono">Configurando habitaciones, galería y pagos...</p>
          </div>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle2 className="mx-auto text-emerald-400" size={64} />
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white uppercase tracking-widest">¡Todo Listo!</h3>
            <p className="text-zinc-500 text-sm">Redirigiendo al dashboard...</p>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle className="mx-auto text-rose-500" size={64} />
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase tracking-widest">Error en la Activación</h3>
            <p className="text-zinc-400 text-sm">{errorMessage}</p>
            <button
              onClick={() => { reset(); router.push('/software/onboarding'); }}
              className="px-8 py-3 bg-zinc-800 border border-white/10 rounded-[var(--radius-squircle-xl)] text-white font-bold hover:bg-zinc-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
