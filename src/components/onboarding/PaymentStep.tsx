'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import WompiButton from '@/components/payments/WompiButton';

const wompiRef = `ONB-${Date.now()}`;

export default function PaymentStep() {
  const { hotelIdentity, rooms, settings, paymentPrice, paymentTransactionId, setPaymentTransactionId } = useOnboardingStore();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 max-w-xl mx-auto text-center">
      <div className="space-y-2">
        <CreditCard className="mx-auto text-indigo-400" size={32} />
        <h3 className="text-2xl font-bold text-white">Resumen y Activación</h3>
        <p className="text-zinc-500 text-sm">Revisá todo y activá tu propiedad</p>
      </div>

      {/* Summary Card */}
      <div className="bg-black/40 p-6 rounded-[var(--radius-squircle-2xl)] border border-white/5 text-left space-y-4">
        <div>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Propiedad</p>
          <p className="text-white font-bold text-lg">{hotelIdentity.name || 'Sin nombre'}</p>
          <p className="text-zinc-500 text-sm">{hotelIdentity.city}, {hotelIdentity.location}</p>
        </div>
        <div className="flex gap-3">
          <span className="bg-indigo-500/10 text-indigo-400 text-xs px-3 py-1 rounded-[var(--radius-squircle-md)] border border-indigo-500/20 font-mono">{rooms.length} unidad{rooms.length > 1 ? 'es' : ''}</span>
          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1 rounded-[var(--radius-squircle-md)] border border-emerald-500/20 font-bold uppercase">{hotelIdentity.propertyType}</span>
        </div>
        <div className="border-t border-white/5 pt-3">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Amenities configurados</p>
          <p className="text-zinc-400 text-sm">{settings.amenities.length} amenities seleccionados</p>
        </div>
      </div>

      {paymentTransactionId ? (
        <div className="space-y-4">
          <CheckCircle2 className="mx-auto text-emerald-400" size={48} />
          <p className="text-emerald-400 font-bold">¡Pago procesado! Activando tu propiedad...</p>
        </div>
      ) : (
        <div className="max-w-sm mx-auto">
          <WompiButton
            amount={paymentPrice}
            reference={wompiRef}
            publicKey={process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || 'pub_test_Q5yS9j9vD177N68494Yy637R9Y6606vH'}
            isSubscription={true}
            onSuccess={(txId) => { setPaymentTransactionId(txId); }}
          />
        </div>
      )}
    </motion.div>
  );
}
