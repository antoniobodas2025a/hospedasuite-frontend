'use client';

import { useState } from 'react';
import { User, CreditCard, Loader2 } from 'lucide-react';
import { createPendingBookingAction } from '@/app/actions/bookings';

interface CheckoutFormProps {
  priceToPay: number;
  roomId: string;
  checkin: string;
  checkout: string;
  isOta: boolean;
}

export function CheckoutForm({ priceToPay, roomId, checkin, checkout, isOta }: CheckoutFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    document: '',
    email: '',
    phone: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.document || !formData.phone) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    setIsProcessing(true);
    
    const payload = {
      ...formData,
      amount: priceToPay,
      roomId,
      checkin,
      checkout,
      source: isOta ? 'ota' : 'direct'
    };
    
    const result = await createPendingBookingAction(payload);

    if (!result.success || !result.bookingId) {
      alert(`Ocurrió un error al procesar tu solicitud: ${result.error}`);
      setIsProcessing(false);
      return;
    }

    // 🚨 FIX QA CRÍTICO: Descontaminación de Variables para AWS CloudFront
    
    // 1. Aseguramos que el monto sea un número entero perfecto (ej. 15000000)
    const amountInCents = Math.round(Number(priceToPay) * 100);
    
    // 2. Limpieza agresiva de la llave (Elimina comillas, espacios invisibles y retornos de carro)
    let rawKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '';
    const cleanPublicKey = rawKey.replace(/['"\s\r\n]+/g, '');
    
    if (!cleanPublicKey) {
      alert("Error del sistema: Pasarela de pago no configurada en las variables de entorno.");
      setIsProcessing(false);
      return;
    }
    
    // 3. Preparar la URL de redirección. Usamos la API nativa de URL para evitar errores de codificación manual
    const redirectUrl = `${window.location.origin}/book/success?id=${result.bookingId}`;
    
    // 4. Construcción paramétrica segura
    const wompiUrl = new URL('https://checkout.wompi.co/p/');
    wompiUrl.searchParams.append('public-key', cleanPublicKey);
    wompiUrl.searchParams.append('currency', 'COP');
    wompiUrl.searchParams.append('amount-in-cents', amountInCents.toString());
    wompiUrl.searchParams.append('reference', result.bookingId);
    wompiUrl.searchParams.append('redirect-url', redirectUrl);
    
    // Log de diagnóstico en consola por si sigue fallando
    console.log("🚀 URL de Pago Generada (Limpia):", wompiUrl.toString());

    // Despegamos hacia la pasarela
    window.location.href = wompiUrl.toString();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <User className="text-hospeda-600" size={24} />
          <h2 className="text-xl font-bold text-slate-800">Tus Datos</h2>
        </div>
        
        <form id="checkout-form" onSubmit={handlePayment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
              <input 
                type="text" 
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full text-slate-900 bg-white rounded-xl border-slate-300 shadow-sm focus:border-hospeda-500 focus:ring-hospeda-500" 
                placeholder="Ej. Juan Pérez" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Documento / Pasaporte</label>
              <input 
                type="text" 
                name="document"
                value={formData.document}
                onChange={handleChange}
                required
                className="w-full text-slate-900 bg-white rounded-xl border-slate-300 shadow-sm focus:border-hospeda-500 focus:ring-hospeda-500" 
                placeholder="Número de documento" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full text-slate-900 bg-white rounded-xl border-slate-300 shadow-sm focus:border-hospeda-500 focus:ring-hospeda-500" 
                placeholder="correo@ejemplo.com" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono / WhatsApp</label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full text-slate-900 bg-white rounded-xl border-slate-300 shadow-sm focus:border-hospeda-500 focus:ring-hospeda-500" 
                placeholder="+57 300 000 0000" 
              />
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <CreditCard className="text-hospeda-600" size={24} />
          <h2 className="text-xl font-bold text-slate-800">Pago Seguro</h2>
        </div>
        <p className="text-slate-500 text-sm mb-6">Serás redirigido a la pasarela segura de Wompi para completar tu transacción.</p>
        
        <button 
          form="checkout-form"
          type="submit"
          disabled={isProcessing}
          className="w-full bg-hospeda-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? <><Loader2 className="animate-spin" size={20} /> Conectando con el banco...</> : `Pagar $${priceToPay.toLocaleString()} COP`}
        </button>
      </div>
    </div>
  );
}