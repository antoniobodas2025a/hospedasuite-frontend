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

  if (!roomId || !checkin || !checkout || !isValidDateISO(checkin) || !isValidDateISO(checkout)) {
    redirect(`/book/${slug}`);
  }

  const supabase = await createClient();

  const { data: hotel, error: hotelError } = await supabase
    .from('hotels')
    .select('id, name, primary_color, cancellation_policy, location, main_image_url, tax_rate')
    .eq('slug', slug)
    .single();

  if (hotelError) console.error("[AUDITORIA FATAL] Error critico en DB al buscar Hotel:", hotelError);

  if (!hotel) {
    console.error(`[AUDITORIA FATAL] Abortando: Hotel no encontrado para el slug "${slug}"`);
    notFound();
  }

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, hotel_id, name, price, base_price, capacity, status, description, gallery')
    .eq('id', roomId)
    .eq('hotel_id', hotel.id)
    .single();

  if (roomError) console.error("[AUDITORIA FATAL] Error critico en DB al buscar Habitacion:", roomError);

  if (!room) {
    console.error(`[AUDITORIA FATAL] Abortando: Habitacion no encontrada para id "${roomId}"`);
    notFound();
  }

  const checkInDate = new Date(`${checkin}T12:00:00Z`);
  const checkOutDate = new Date(`${checkout}T12:00:00Z`);

  if (checkInDate >= checkOutDate) {
    redirect(`/book/${slug}`);
  }

  const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

  const roomPrice = Number(room.price || room.base_price || 0);
  const basePrice = roomPrice * nights;

  return (
    <div className="min-h-screen bg-background selection:bg-brand-200 selection:text-brand-900 pb-24 pt-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-extrabold text-foreground mb-8 text-center">Completa tu Reserva</h1>

        <CheckoutForm
          hotel={hotel}
          room={{...room, price: roomPrice}}
          checkIn={checkin}
          checkOut={checkout}
          nights={nights}
          basePrice={basePrice}
          isOta={isOta}
          taxRate={hotel.tax_rate}
        />

      </div>
    </div>
  );
}
