import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import CheckoutForm from '@/components/checkout/CheckoutForm'; 

export const dynamic = 'force-dynamic';

interface CheckoutPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const isValidDateISO = (dateStr: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { slug } = await params;
  const resolvedParams = await searchParams;
  
  const roomId = typeof resolvedParams.room === 'string' ? resolvedParams.room : null;
  const checkin = typeof resolvedParams.checkin === 'string' ? resolvedParams.checkin : null;
  const checkout = typeof resolvedParams.checkout === 'string' ? resolvedParams.checkout : null;
  const isOta = resolvedParams.ref === 'ota'; 

  console.log("=========================================");
  console.log(`[AUDITORIA] 1. Iniciando Checkout para slug: ${slug}`);
  console.log(`[AUDITORIA] 2. Room ID: ${roomId}`);

  // 🛡️ Seguridad Fronteriza
  if (!roomId || !checkin || !checkout || !isValidDateISO(checkin) || !isValidDateISO(checkout)) {
    console.error("[AUDITORIA] 3. Parámetros inválidos, redirigiendo al home del hotel...");
    redirect(`/book/${slug}`);
  }

  const supabase = await createClient();

  // --- INICIO DEL BLOQUE INSTRUMENTADO Y CORREGIDO ---
  const { data: hotel, error: hotelError } = await supabase
    .from('hotels')
    .select('id, name, primary_color, cancellation_policy, location, main_image_url')
    .eq('slug', slug) // 🛡️ Búsqueda estricta por slug para evitar 404s fantasma
    .single();

  if (hotelError) console.error("[AUDITORIA FATAL] Error crítico en DB al buscar Hotel:", hotelError);
  
  if (!hotel) {
    console.error(`[AUDITORIA FATAL] Abortando: Hotel no encontrado para el slug "${slug}"`);
    notFound();
  }
  console.log(`[AUDITORIA] 4. Hotel encontrado exitosamente: ${hotel.name}`);

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, name, price, base_price, capacity, description, gallery') // 🛡️ Columnas exactas, sin price_per_night
    .eq('id', roomId)
    .eq('hotel_id', hotel.id)
    .single();

  if (roomError) console.error("[AUDITORIA FATAL] Error crítico en DB al buscar Habitación:", roomError);
  
  if (!room) {
    console.error(`[AUDITORIA FATAL] Abortando: Habitación no encontrada para id "${roomId}"`);
    notFound();
  }
  console.log(`[AUDITORIA] 5. Habitación encontrada exitosamente: ${room.name}`);
  // --- FIN DEL BLOQUE INSTRUMENTADO ---

  const checkInDate = new Date(`${checkin}T12:00:00Z`);
  const checkOutDate = new Date(`${checkout}T12:00:00Z`);
  
  if (checkInDate >= checkOutDate) {
    console.error("[AUDITORIA] Conflicto temporal: Check-out es anterior o igual al Check-in.");
    redirect(`/book/${slug}`);
  }

  const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  // 🛡️ Blindaje de Precios Matemático: Se garantiza una tarifa > 0 usando las columnas reales
  const roomPrice = Number(room.price || room.base_price || 0);
  const basePrice = roomPrice * nights;

  console.log(`[AUDITORIA] 6. Renderizando UI de Checkout. Noches: ${nights} | Tarifa Noche: ${roomPrice} | Total Base: ${basePrice}`);
  console.log("=========================================");

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-hospeda-200 selection:text-hospeda-900 pb-24 pt-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-8 text-center">Completa tu Reserva</h1>
        
        {/* 🛡️ Inyección limpia del componente con el precio saneado */}
        <CheckoutForm 
          hotel={hotel} 
          room={{...room, price: roomPrice}} 
          checkIn={checkin} 
          checkOut={checkout} 
          nights={nights} 
          basePrice={basePrice} 
          isOta={isOta}
        />
        
      </div>
    </div>
  );
}