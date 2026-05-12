'use client';

import React, { useState } from 'react';
import { Wine, Coffee, HeartHandshake, ShieldCheck, ArrowRight, User, Mail, Phone, CreditCard, Loader2 } from 'lucide-react';
import { createPendingBookingAction } from '@/app/actions/bookings';
import { Hotel, Room } from '@/types';

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
  { id: 'wine', title: 'Botella de Vino Tinto', description: 'Te espera en tu habitacion al llegar.', price: 75000, icon: Wine },
  { id: 'breakfast', title: 'Desayuno a la Cama', description: 'Servicio exclusivo para 2 personas.', price: 45000, icon: Coffee },
  { id: 'romantic', title: 'Decoracion Romantica', description: 'Petalos, velas y fresas.', price: 120000, icon: HeartHandshake },
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
      source: (isOta ? 'ota' : 'direct') as 'ota' | 'direct',
      upsells: selectedUpsells
    };

    const result = await createPendingBookingAction(payload);

    if (!result?.success || !result?.bookingId) {
      alert(`Ocurrio un error al procesar tu solicitud: ${result?.error || 'Desconocido'}`);
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

    const wompiUrl = new URL('https://checkout.wompi.co/p/');
    wompiUrl.searchParams.append('public-key', cleanPublicKey);
    wompiUrl.searchParams.append('currency', 'COP');
    wompiUrl.searchParams.append('amount-in-cents', amountInCents.toString());
    wompiUrl.searchParams.append('reference', result.bookingId);
    wompiUrl.searchParams.append('redirect-url', redirectUrl);

    window.location.href = wompiUrl.toString();
  };

  return (
    <form id="checkout-form" onSubmit={handlePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-7 space-y-8">
        <section className="bg-card p-6 sm:p-8 rounded-[2rem] shadow-sm border border-border">
          <h2 className="text-xl font-bold text-foreground mb-2">Mejora tu Experiencia</h2>
          <p className="text-muted-foreground text-sm mb-6">Anade estos extras para hacer tu estadia inolvidable.</p>
          <div className="space-y-4">
            {UPSELL_OPTIONS.map(opt => {
              const isSelected = selectedUpsells.includes(opt.id);
              const Icon = opt.icon;
              return (
                <div key={opt.id} onClick={() => toggleUpsell(opt.id)} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-brand-500 bg-brand-50' : 'border-border hover:border-border/80'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isSelected ? 'bg-brand-100 text-brand-600' : 'bg-muted text-muted-foreground/40'}`}>
                      <Icon size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className={`font-bold ${isSelected ? 'text-brand-900' : 'text-foreground/80'}`}>{opt.title}</h4>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${isSelected ? 'text-brand-600' : 'text-foreground'}`}>+${opt.price.toLocaleString()}</p>
                    <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${isSelected ? 'text-brand-500' : 'text-muted-foreground/30'}`}>{isSelected ? 'Agregado' : 'Agregar'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-card p-6 sm:p-8 rounded-[2rem] shadow-sm border border-border">
          <h2 className="text-xl font-bold text-foreground mb-6">Tus Datos</h2>
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input required type="text" placeholder="Nombre Completo" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl text-foreground font-bold outline-none focus:ring-2 focus:ring-brand-400 transition-all" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input required type="text" placeholder="Documento (CC/Pasaporte)" value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl text-foreground font-bold outline-none focus:ring-2 focus:ring-brand-400 transition-all" />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input required type="tel" placeholder="WhatsApp" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl text-foreground font-bold outline-none focus:ring-2 focus:ring-brand-400 transition-all" />
              </div>
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input required type="email" placeholder="Correo Electronico" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-xl text-foreground font-bold outline-none focus:ring-2 focus:ring-brand-400 transition-all" />
            </div>
          </div>
        </section>
      </div>

      <div className="lg:col-span-5 sticky top-8">
        <section className="bg-foreground p-8 rounded-[2rem] shadow-2xl text-background">
          <h2 className="text-xl font-bold mb-6">Resumen de Reserva</h2>
          <div className="space-y-4 mb-6 border-b border-background/20 pb-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-background/60 text-sm">{room.name}</p>
                <p className="font-bold">{nights} {nights === 1 ? 'Noche' : 'Noches'}</p>
                <p className="text-xs text-background/40 mt-1">{checkIn} al {checkOut}</p>
              </div>
              <p className="font-bold">${basePrice.toLocaleString()}</p>
            </div>
            {selectedUpsells.length > 0 && (
              <div className="flex justify-between items-start animate-in fade-in duration-300 text-brand-400">
                <p className="text-sm font-bold">Extras ({selectedUpsells.length})</p>
                <p className="font-bold">${upsellsTotal.toLocaleString()}</p>
              </div>
            )}
          </div>
          <div className="flex justify-between items-end mb-8">
            <p className="text-background/60">Total a Pagar</p>
            <p className="text-3xl font-black">${grandTotal.toLocaleString()} <span className="text-sm text-background/40 font-medium">COP</span></p>
          </div>
          <button form="checkout-form" type="submit" disabled={isSubmitting} style={{ backgroundColor: hotel.primary_color || '#0ea5e9' }} className="w-full py-4 rounded-xl text-background font-bold flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/50 disabled:opacity-50 disabled:scale-100">
            {isSubmitting ? <><Loader2 className="animate-spin" size={20}/> Procesando...</> : <>Pagar Seguro <ArrowRight size={20}/></>}
          </button>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-background/60 font-medium">
            <ShieldCheck size={16} className="text-secondary" /> Transaccion 100% segura
          </div>
          {hotel.cancellation_policy && (
            <div className="mt-4 p-4 bg-background/10 rounded-xl text-xs text-background/60 leading-relaxed border border-background/20">
              <span className="font-bold text-background/80 block mb-1">Politica de Cancelacion:</span>
              {hotel.cancellation_policy}
            </div>
          )}
        </section>
      </div>
    </form>
  );
}
