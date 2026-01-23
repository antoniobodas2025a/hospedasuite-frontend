// UBICACIÓN: supabase/functions/wompi-checkout/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.110.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    // 1. RECIBIMOS EL TOTAL DE LA RESERVA (Vital para tu regla del 10%)
    const { bookingId, amount, totalBookingAmount, origin, hotelId } =
      await req.json();

    // 2. VALIDAMOS TUS LLAVES (Dinero llega a ti - Tenencia)
    const platformPublicKey = Deno.env.get('PLATFORM_WOMPI_PUBLIC_KEY');
    const platformIntegritySecret = Deno.env.get(
      'PLATFORM_WOMPI_INTEGRITY_SECRET',
    );

    if (!platformPublicKey || !platformIntegritySecret) {
      throw new Error('Faltan las llaves de la Plataforma (Tenencia).');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Traemos la tasa pactada con el hotel
    const { data: hotel, error } = await supabase
      .from('hotels')
      .select('commission_rate, name')
      .eq('id', hotelId)
      .single();

    if (error || !hotel) throw new Error('Hotel no encontrado.');

    // 3. MATEMÁTICA FINANCIERA (La Lógica que pediste)
    const amountInCents = Math.round(amount * 100); // Lo que paga el cliente HOY
    const totalContractInCents = Math.round(
      (totalBookingAmount || amount) * 100,
    ); // Valor total del contrato
    const currency = 'COP';
    const reference = `${bookingId}-${Date.now().toString().slice(-5)}`;

    // A. REGLA DE ORIGEN: ¿Por dónde entró?
    // Link Directo (Instagram) = 0% Comisión.
    // Link OTA (HospedaSuite) = 10% (o tasa configurada) sobre el TOTAL.
    const isDirectSale = origin === 'direct';
    const commissionRate = isDirectSale ? 0 : hotel.commission_rate || 10;

    // B. CÁLCULO DE TU GANANCIA
    let platformCommissionInCents = Math.round(
      totalContractInCents * (commissionRate / 100),
    );

    // Seguridad: No podemos cobrar más de lo que entra hoy.
    if (platformCommissionInCents > amountInCents) {
      platformCommissionInCents = amountInCents;
    }

    // C. COSTOS BANCARIOS (Que paga el Hotel)

    // C1. Costo Recaudo Wompi (Entrada): 2.65% + $700 + IVA
    const recaudoBase = amountInCents * 0.0265 + 70000;
    const recaudoTotalInCents = Math.round(recaudoBase * 1.19); // +19% IVA

    // C2. Costo Dispersión (Salida): $1.849 + 0.4% + IVA
    // Esto se descuenta del saldo disponible para transferir.
    // Fórmula: Neto = (Disponible - CostoFijoIVA) / (1 + TasaVariableIVA)
    const fixedDispersionCostInCents = 220031; // ($1849 * 1.19)
    const variableDispersionFactor = 1.00476; // (1 + (0.004 * 1.19))

    // D. NETO A TRANSFERIR AL HOTEL
    // Disponible = Lo que entró - Costo Entrada - Tu Comisión
    const availableInPlatform =
      amountInCents - recaudoTotalInCents - platformCommissionInCents;

    let netToHotelInCents = 0;
    if (availableInPlatform > fixedDispersionCostInCents) {
      netToHotelInCents = Math.round(
        (availableInPlatform - fixedDispersionCostInCents) /
          variableDispersionFactor,
      );
    }

    // 4. GENERAR LINK DE PAGO (A tu cuenta)
    const integrityString = `${reference}${amountInCents}${currency}${platformIntegritySecret}`;
    const msgUint8 = new TextEncoder().encode(integrityString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const signature = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const redirectUrl = `https://checkout.wompi.co/p/?public-key=${platformPublicKey}&currency=${currency}&amount-in-cents=${amountInCents}&reference=${reference}&signature:integrity=${signature}&redirect-url=https://hospedasuite.com/booking-success?id=${bookingId}`;

    return new Response(
      JSON.stringify({
        success: true,
        redirectUrl,
        reference,
        audit: {
          origin: isDirectSale ? 'DIRECTO (0%)' : `OTA (${commissionRate}%)`,
          total_reserva: totalContractInCents / 100,
          pago_hoy: amountInCents / 100,
          tu_ganancia: platformCommissionInCents / 100,
          neto_hotel: netToHotelInCents / 100,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
