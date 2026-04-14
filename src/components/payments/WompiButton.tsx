'use client';

import React, { useState } from 'react';
import { generateWompiSignature } from '@/app/actions/wompi';
import { Loader2, CreditCard } from 'lucide-react';
import Script from 'next/script';

interface WompiButtonProps {
  amount: number;
  reference: string;
  publicKey: string;
  email?: string;
  onSuccess?: () => void;
}

const WompiButton = ({
  amount,
  reference,
  publicKey,
  email,
  onSuccess,
}: WompiButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    // 1. Pedir la firma segura al servidor
    const { signature, amountInCents, currency, error } =
      await generateWompiSignature(amount, reference);

    if (error) {
      alert('Error de Seguridad: ' + error);
      setLoading(false);
      return;
    }

    // 2. Construcción Dinámica del Payload (Evasión de WAF)
    const widgetConfig: any = {
      currency: currency,
      amountInCents: amountInCents,
      reference: reference,
      publicKey: publicKey,
      signature: { integrity: signature }, 
      redirectUrl: `${window.location.origin}/dashboard/checkout?status=approved`, 
    };

    // 🛡️ SecOps Fix: Solo inyectamos customerData si el email existe y no es un string vacío
    if (email && email.trim() !== '') {
      widgetConfig.customerData = {
        email: email.trim(),
      };
    }

    // 3. Abrir Wompi
    const checkout = new (window as any).WidgetCheckout(widgetConfig);
    
    checkout.open((result: any) => {
      const transaction = result.transaction;
      if (transaction.status === 'APPROVED') {
        alert('✅ Pago Aprobado: ' + transaction.id);
        if (onSuccess) onSuccess();
      } else if (transaction.status === 'DECLINED') {
        alert('❌ Pago Rechazado');
      } else {
        alert('⚠️ Estado: ' + transaction.status);
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
        className='w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed'
      >
        {loading ? (
          <Loader2 className='animate-spin' />
        ) : (
          <CreditCard size={20} />
        )}
        {loading
          ? 'Conectando con Banco...'
          : `Pagar $${amount.toLocaleString()} con Wompi`}
      </button>
    </>
  );
};

export default WompiButton;