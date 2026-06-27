'use client';

import { motion } from 'framer-motion';
import { CreditCard, CheckCircle2, Wallet, Gift } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import type { PaymentMethod } from '@/lib/onboarding-schemas';
import WompiButton from '@/components/payments/WompiButton';
import ManualPaymentCard from './ManualPaymentCard';
import { useIsMobile } from '@/hooks/useIsMediaQuery';

const wompiRef = `ONB-${Date.now()}`;

export default function PaymentStep() {
  const t = useTranslations('onboarding.payment');
  const locale = useLocale();
  const isMobile = useIsMobile();
  const {
    paymentMethod,
    setPaymentMethod,
    paymentPrice,
    paymentTransactionId,
    setPaymentTransactionId,
    manualReceiptUrl,
  } = useOnboardingStore();

  const isMethodSelected = paymentMethod !== null;
  const isPaymentDone =
    paymentMethod === 'free'
      ? true
      : paymentMethod === 'wompi'
        ? !!paymentTransactionId
        : !!manualReceiptUrl;

  const handleMethodSelect = (method: PaymentMethod) => {
    if (paymentMethod !== method) {
      setPaymentMethod(method);
      if (method === 'free') {
        setPaymentTransactionId(`FREE-${Date.now()}`);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="space-y-8 max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <CreditCard className="mx-auto text-indigo-400" size={32} />
        <h3 className="text-2xl font-bold text-white">{t('title')}</h3>
        <p className="text-zinc-500 text-sm">{t('subtitle')}</p>
        {locale === 'en' && (
          <p className="text-zinc-600 text-xs italic">{t('englishLocaleNote')}</p>
        )}
      </div>

      {/* Method selector (tab/radio) */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-center">
          Método de pago
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleMethodSelect('wompi')}
            className={`p-5 rounded-[var(--radius-squircle-xl)] border text-center transition-all ${
              paymentMethod === 'wompi'
                ? 'bg-slate-800/40 border-slate-500/30 ring-1 ring-slate-500/20'
                : 'bg-black/30 border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300'
            }`}
          >
            <CreditCard
              size={24}
              className={`mx-auto mb-2 ${paymentMethod === 'wompi' ? 'text-indigo-400' : 'text-zinc-600'}`}
            />
            <p className={`font-bold text-sm ${paymentMethod === 'wompi' ? 'text-white' : 'text-zinc-500'}`}>
              Wompi
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">Tarjeta débito/crédito</p>
          </button>

          <button
            onClick={() => handleMethodSelect('manual')}
            className={`p-5 rounded-[var(--radius-squircle-xl)] border text-center transition-all ${
              paymentMethod === 'manual'
                ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20'
                : 'bg-black/30 border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300'
            }`}
          >
            <Wallet
              size={24}
              className={`mx-auto mb-2 ${paymentMethod === 'manual' ? 'text-emerald-400' : 'text-zinc-600'}`}
            />
            <p className={`font-bold text-sm ${paymentMethod === 'manual' ? 'text-white' : 'text-zinc-500'}`}>
              Manual
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">Nequi / Daviplata</p>
          </button>
        </div>

        {/* Free activation — ALL devices (Ley de Hick: activación sin fricción) */}
        <button
          onClick={() => handleMethodSelect('free')}
          className={`w-full p-5 rounded-[var(--radius-squircle-xl)] border text-center transition-all bg-gradient-to-r from-emerald-500/5 to-green-500/5 ${
            paymentMethod === 'free'
              ? 'border-emerald-500/40 ring-1 ring-emerald-500/30 bg-emerald-500/10'
              : 'border-emerald-500/20 text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-300'
          }`}
        >
          <Gift
            size={24}
            className={`mx-auto mb-2 ${paymentMethod === 'free' ? 'text-emerald-400' : 'text-emerald-600'}`}
          />
          <p className={`font-bold text-sm ${paymentMethod === 'free' ? 'text-emerald-300' : 'text-emerald-500'}`}>
            Activar gratis
          </p>
          <p className="text-[10px] text-emerald-700 mt-1">30 días de prueba gratis</p>
        </button>
      </div>

      {/* Conditional payment UI */}
      {isMethodSelected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm mx-auto"
        >
          {isPaymentDone ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="mx-auto text-emerald-400" size={48} />
              <p className="text-emerald-400 font-bold">
                {paymentMethod === 'free'
                  ? 'Activación gratuita seleccionada'
                  : paymentMethod === 'wompi'
                    ? t('paymentProcessed')
                    : 'Comprobante recibido'}
              </p>
            </div>
          ) : paymentMethod === 'wompi' ? (
            <div className="space-y-3">
              <WompiButton
                amount={paymentPrice}
                reference={wompiRef}
                publicKey={process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || 'pub_test_Q5yS9j9vD177N68494Yy637R9Y6606vH'}
                isSubscription={true}
                onSuccess={(txId) => { setPaymentTransactionId(txId); }}
              />
              {/* Demo bypass — SOLO en desarrollo (Heurística #5: Prevención de Errores) */}
              {process.env.NODE_ENV !== 'production' && (
                <button
                  onClick={() => setPaymentTransactionId(`DEMO-${Date.now()}`)}
                  className="w-full py-3 text-xs font-bold text-zinc-600 hover:text-zinc-400 transition-colors border border-dashed border-zinc-800 hover:border-zinc-600 rounded-[var(--radius-squircle-lg)]"
                >
                  {t('demoBypass')}
                </button>
              )}
            </div>
          ) : (
            <ManualPaymentCard />
          )}
        </motion.div>
      )}

      {/* Not selected yet */}
      {!isMethodSelected && (
        <p className="text-zinc-700 text-sm text-center italic">
          Seleccioná un método de pago para continuar
        </p>
      )}
    </motion.div>
  );
}
