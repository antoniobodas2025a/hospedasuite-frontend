'use client';

import React, { useState } from 'react';
import { generateWompiSignature } from '@/app/actions/wompi';
import { Loader2, CreditCard, ShieldCheck } from 'lucide-react';
import Script from 'next/script';

interface WompiButtonProps {
  amount: number;
  reference: string;
  publicKey: string;
  email?: string;
  hotelId?: string; // 🛡️ Opcional: Define si es pago interno o SaaS
  isSubscription?: boolean; // 🚀 Activa la UI de "Plan Pionero"
  redirectUrl?: string; // 🛡️ Flexibilidad de redirección explícita
  onSuccess?: (transactionId: string) => void;
}

const WompiButton = ({
  amount,
  reference,
  publicKey,
  email,
  hotelId,
  isSubscription = false,
  redirectUrl,
  onSuccess,
}: WompiButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    // 1. RESOLUCIÓN DE FIRMA POLIMÓRFICA (SaaS vs Tenant)
    const { success, signature, amountInCents, currency, error } =
      await generateWompiSignature(amount, reference, hotelId);

    if (!success) {
      alert('🚨 Error de Seguridad Criptográfica: ' + error);
      setLoading(false);
      return;
    }

    // 🛡️ RESOLUCIÓN DE ENRUTAMIENTO DETERMINISTA
    const finalRedirectUrl = redirectUrl 
      ? `${window.location.origin}${redirectUrl}`
      : isSubscription 
        ? `${window.location.origin}/software/onboarding/success`
        : `${window.location.origin}/dashboard/checkout?status=approved`;

    // 2. CONSTRUCCIÓN DEL PAYLOAD BLINDADO (Evasión de WAF)
    const widgetConfig: any = {
      currency: currency,
      amountInCents: amountInCents,
      reference: reference,
      publicKey: publicKey,
      signature: { integrity: signature },
      redirectUrl: finalRedirectUrl, 
    };

    if (email && email.trim() !== '') {
      widgetConfig.customerData = {
        email: email.trim(),
      };
    }

    // 3. INYECCIÓN DEL IFRAME DE BÓVEDA (PCI-DSS)
    const checkout = new (window as any).WidgetCheckout(widgetConfig);
    
    checkout.open((result: any) => {
      const transaction = result.transaction;
      if (transaction.status === 'APPROVED') {
        if (onSuccess) onSuccess(transaction.id);
      } else if (transaction.status === 'DECLINED') {
        alert('❌ Método de pago rechazado por el banco emisor.');
      } else {
        alert('⚠️ Estado de transacción pendiente: ' + transaction.status);
      }
      setLoading(false);
    });
  };

  return (
    <>
      <Script
        src='https://checkout.wompi.co/widget.js'
        strategy='lazyOnload'
      />

      <button
        onClick={handlePayment}
        disabled={loading}
        className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed ${
          isSubscription 
            ? 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20' 
            : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
        }`}
      >
        {loading ? (
          <Loader2 className='animate-spin size-5' />
        ) : isSubscription ? (
          <ShieldCheck className='size-5 text-emerald-400' />
        ) : (
          <CreditCard className='size-5' />
        )}

        {loading
          ? 'Conectando con Bóveda...'
          : isSubscription
            ? 'Vincular Tarjeta y Activar 90 Días Gratis'
            : `Pagar $${amount.toLocaleString()} con Wompi`}
      </button>
    </>
  );
};

export default WompiButton;