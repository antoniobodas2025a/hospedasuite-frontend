import { getHotelDetailsBySlugAction } from '@/app/actions/ota';
import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import { ShieldCheck, MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Completar Reserva | HospedaSuite',
  robots: { index: false, follow: false },
};

// 🚨 FIX QA: Interfaz restaurada
interface CheckoutPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ room?: string; ref?: string; checkin?: string; checkout?: string }>;
}

const isValidDateString = (dateStr: string) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { slug } = await params;
  const { room: roomId, ref, checkin, checkout } = await searchParams;

  if (!roomId) return notFound();

  if (!checkin || !checkout) {
    redirect(`/hotel/${slug}?showRoom=${roomId}`);
  }

  if (!isValidDateString(checkin) || !isValidDateString(checkout)) {
    redirect(`/hotel/${slug}?showRoom=${roomId}`);
  }

  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);

  if (checkinDate >= checkoutDate) {
    redirect(`/hotel/${slug}?showRoom=${roomId}`);
  }

  const { success, hotel } = await getHotelDetailsBySlugAction(slug);

  if (!success || !hotel) return notFound();

  const selectedRoom = hotel.rooms?.find((r: any) => r.id === roomId);
  if (!selectedRoom) return notFound();

  const isOta = ref === 'ota';
  const pricePerNight = selectedRoom.price || selectedRoom.price_per_night || 0;
  
  // 🚨 FIX QA CRÍTICO: Cálculo Matemático Inhackeable de Noches
  const diffTime = Math.abs(checkoutDate.getTime() - checkinDate.getTime());
  const validNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  
  // El precio total se calcula en base a la matemática de fechas estricta
  const priceToPay = pricePerNight * validNights;

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-slate-900">Finaliza tu reserva</h1>
          <p className="text-slate-500 mt-2">Estás a un paso de confirmar tu estadía en <span className="font-semibold text-slate-700">{hotel.name}</span></p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <CheckoutForm 
              priceToPay={priceToPay} 
              roomId={roomId}
              checkin={checkin}
              checkout={checkout}
              isOta={isOta}
            />
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-8">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Detalles de la estadía</h3>
              
              <div className="flex gap-4 mb-6">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                  <Image 
                    src={(selectedRoom.gallery && selectedRoom.gallery.length > 0) ? selectedRoom.gallery[0].url : (hotel.main_image_url || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32')} 
                    alt={selectedRoom.name} 
                    fill 
                    className="object-cover" 
                  />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 line-clamp-2">{selectedRoom.name}</h4>
                  <p className="text-sm text-slate-500 mt-1">{hotel.name}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                    <MapPin size={12} /> {hotel.location}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Check-in</p>
                  <p className="text-sm font-semibold text-slate-700">{checkin}</p>
                </div>
                <div className="h-8 border-l border-slate-300"></div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Check-out</p>
                  <p className="text-sm font-semibold text-slate-700">{checkout}</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex justify-between text-slate-600">
                  <span>${pricePerNight.toLocaleString()} x {validNights} {validNights === 1 ? 'noche' : 'noches'}</span>
                  <span>${priceToPay.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Impuestos y comisiones</span>
                  <span className="text-emerald-600 font-medium">Incluidos</span>
                </div>
              </div>

              <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between items-center">
                <span className="font-bold text-slate-800">Total a Pagar</span>
                <span className="text-2xl font-display font-bold text-slate-900">${priceToPay.toLocaleString()}</span>
              </div>

              <div className="mt-6 flex items-start gap-3 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
                <p className="text-xs text-emerald-800 font-medium">
                  Reserva protegida. Tienes cancelación gratuita hasta 48 horas antes del check-in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}