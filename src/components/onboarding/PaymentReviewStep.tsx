'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle2, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import WompiButton from '@/components/payments/WompiButton';
import PropertyPreview from './PropertyPreview';

const wompiRef = `ONB-${Date.now()}`;

export default function PaymentReviewStep() {
  const t = useTranslations('onboarding.payment');
  const { paymentPrice, paymentTransactionId, setPaymentTransactionId } = useOnboardingStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="space-y-8 max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <Eye className="mx-auto text-indigo-400" size={32} />
        <h3 className="text-2xl font-bold text-white">{t('reviewTitle') || t('title')}</h3>
        <p className="text-zinc-500 text-sm">{t('reviewSubtitle') || t('subtitle')}</p>
      </div>

      {/* Guest-facing preview */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-center">{t('guestFacingPreview')}</p>
        <PropertyPreview />
      </div>

      {/* Payment */}
      {paymentTransactionId ? (
        <div className="text-center space-y-4">
          <CheckCircle2 className="mx-auto text-emerald-400" size={48} />
          <p className="text-emerald-400 font-bold">{t('paymentProcessed')}</p>
        </div>
      ) : (
        <div className="max-w-sm mx-auto space-y-3">
          <WompiButton
            amount={paymentPrice}
            reference={wompiRef}
            publicKey={process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || 'pub_test_Q5yS9j9vD177N68494Yy637R9Y6606vH'}
            isSubscription={true}
            onSuccess={(txId) => { setPaymentTransactionId(txId); }}
          />
          {/* Demo bypass — solo para presentaciones */}
          <button
            onClick={() => setPaymentTransactionId(`DEMO-${Date.now()}`)}
            className="w-full py-3 text-xs font-bold text-zinc-600 hover:text-zinc-400 transition-colors border border-dashed border-zinc-800 hover:border-zinc-600 rounded-[var(--radius-squircle-lg)]"
          >
            {t('demoBypass')}
          </button>
        </div>
      )}
    </motion.div>
  );
}
