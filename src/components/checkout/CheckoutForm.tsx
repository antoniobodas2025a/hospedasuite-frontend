'use client';

import React, { useState } from 'react';
import { Wine, Coffee, HeartHandshake, ShieldCheck, ArrowRight, User, Mail, Phone, CreditCard, Loader2 } from 'lucide-react';
import { createPendingBookingAction } from '@/app/actions/bookings'; 
import { Hotel, Room } from '@/types'; // 🛡️ DEUDA TÉCNICA SALDADA

interface CheckoutFormProps {
  hotel: Hotel;
  room: Room;
  checkIn: string;
  checkOut: string;
  nights: number;
  basePrice: number;
  isOta: boolean;
}

const UPSELL_OPTIONS = [
  { id: 'wine', title: 'Botella de Vino Tinto', description: 'Te espera en tu habitación al llegar.', price: 75000, icon: Wine },
  { id: 'breakfast', title: 'Desayuno a la Cama', description: 'Servicio exclusivo para 2 personas.', price: 45000, icon: Coffee },
  { id: 'romantic', title: 'Decoración Romántica', description: 'Pétalos, velas y fresas.', price: 120000, icon: HeartHandshake },
];

export default function CheckoutForm({ hotel, room, checkIn, checkOut, nights, basePrice, isOta }: CheckoutFormProps) {
  const [selectedUpsells, setSelectedUpsells] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', document: '' });

  const upsellsTotal = UPSELL_OPTIONS
    .filter(opt => selectedUpsells.includes(opt.id))
    .reduce((sum, opt) => sum + opt.price, 0);
  
  const grandTotal = basePrice + upsellsTotal;

  const toggleUpsell = (id: string) => {
    setSelectedUpsells(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.document || !formData.phone) {
      return alert("Por favor, completa todos tus datos personales.");
    }

    setIsSubmitting(true);
    
    const payload = {
      ...formData,
      amount: grandTotal, 
      roomId: room.id,
      checkin: checkIn,
      checkout: checkOut,
      source: isOta ? 'ota' : 'direct',
      upsells: selectedUpsells 
    };
    
    const result = await createPendingBookingAction(payload);

    if (!result?.success || !result?.bookingId) {
      alert(`Ocurrió un error al procesar tu solicitud: ${result?.error || 'Desconocido'}`);
      setIsSubmitting(false);
      return;
    }

    const amountInCents = Math.round(Number(grandTotal) * 100);
    const rawKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '';
    const cleanPublicKey = rawKey.replace(/['"\s\r\n]+/g, '');
    
    if (!cleanPublicKey) {
      alert("Error del sistema: Pasarela de pago no configurada.");
      setIsSubmitting(false);
      return;
    }
    
    const redirectUrl = `${window.location.origin}/book/success`;

    // 🛡️ Redirección Limpia (Evita el bloqueo 403 del WAF de CloudFront)
    const wompiUrl = new URL('https://checkout.wompi.co/p/');
    wompiUrl.searchParams.append('public-key', cleanPublicKey);
    wompiUrl.searchParams.append('currency', 'COP');
    wompiUrl.searchParams.append('amount-in-cents', amountInCents.toString());
    wompiUrl.searchParams.append('reference', result.bookingId);
    wompiUrl.searchParams.append('redirect-url', redirectUrl);

    // Navegación nativa del navegador
    window.location.href = wompiUrl.toString();
  }; // <--- 🛡️ CURACIÓN FORENSE: CIERRE LÉXICO RESTAURADO

  return (
    <form id="checkout-form" onSubmit={handlePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-7 space-y-8">
        <section className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Mejora tu Experiencia</h2>
          <p className="text-slate-500 text-sm mb-6">Añade estos extras para hacer tu estancia inolvidable.</p>
          <div className="space-y-4">
            {UPSELL_OPTIONS.map(opt => {
              const isSelected = selectedUpsells.includes(opt.id);
              const Icon = opt.icon;
              return (
                <div key={opt.id} onClick={() => toggleUpsell(opt.id)} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-hospeda-500 bg-hospeda-50' : 'border-slate-100 hover:border-slate-200'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isSelected ? 'bg-hospeda-100 text-hospeda-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Icon size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className={`font-bold ${isSelected ? 'text-hospeda-900' : 'text-slate-700'}`}>{opt.title}</h4>
                      <p className="text-xs text-slate-500">{opt.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${isSelected ? 'text-hospeda-600' : 'text-slate-800'}`}>+${opt.price.toLocaleString()}</p>
                    <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${isSelected ? 'text-hospeda-500' : 'text-slate-300'}`}>{isSelected ? 'Agregado' : 'Agregar'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Tus Datos</h2>
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input required type="text" placeholder="Nombre Completo" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-hospeda-400 transition-all" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input required type="text" placeholder="Documento (CC/Pasaporte)" value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-hospeda-400 transition-all" />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input required type="tel" placeholder="WhatsApp" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-hospeda-400 transition-all" />
              </div>
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input required type="email" placeholder="Correo Electrónico" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-hospeda-400 transition-all" />
            </div>
          </div>
        </section>
      </div>

      <div className="lg:col-span-5 sticky top-8">
        <section className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl text-white">
          <h2 className="text-xl font-bold mb-6">Resumen de Reserva</h2>
          <div className="space-y-4 mb-6 border-b border-slate-700 pb-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm">{room.name}</p>
                <p className="font-bold">{nights} {nights === 1 ? 'Noche' : 'Noches'}</p>
                <p className="text-xs text-slate-500 mt-1">{checkIn} al {checkOut}</p>
              </div>
              <p className="font-bold">${basePrice.toLocaleString()}</p>
            </div>
            {selectedUpsells.length > 0 && (
              <div className="flex justify-between items-start animate-in fade-in duration-300 text-hospeda-400">
                <p className="text-sm font-bold">Extras ({selectedUpsells.length})</p>
                <p className="font-bold">${upsellsTotal.toLocaleString()}</p>
              </div>
            )}
          </div>
          <div className="flex justify-between items-end mb-8">
            <p className="text-slate-400">Total a Pagar</p>
            <p className="text-3xl font-black">${grandTotal.toLocaleString()} <span className="text-sm text-slate-500 font-medium">COP</span></p>
          </div>
          <button form="checkout-form" type="submit" disabled={isSubmitting} style={{ backgroundColor: hotel.primary_color || '#0ea5e9' }} className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/50 disabled:opacity-50 disabled:scale-100">
            {isSubmitting ? <><Loader2 className="animate-spin" size={20}/> Procesando...</> : <>Pagar Seguro <ArrowRight size={20}/></>}
          </button>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
            <ShieldCheck size={16} className="text-emerald-400" /> Transacción 100% segura
          </div>
          {hotel.cancellation_policy && (
            <div className="mt-4 p-4 bg-slate-800 rounded-xl text-xs text-slate-400 leading-relaxed border border-slate-700">
              <span className="font-bold text-slate-300 block mb-1">Política de Cancelación:</span>
              {hotel.cancellation_policy}
            </div>
          )}
        </section>
      </div>
    </form>
  );
}