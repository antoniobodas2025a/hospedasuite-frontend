'use server';

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function generateWompiSignature(
  amount: number,
  reference: string,
  hotelId: string 
) {
  try {
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('wompi_integrity_secret')
      .eq('id', hotelId)
      .single();

    if (hotelError || !hotel?.wompi_integrity_secret) {
      console.error('[SEC-OPS] Firma abortada. Secreto faltante para tenant:', hotelId);
      return { error: 'No hay clave secreta de Wompi configurada para este alojamiento.' };
    }

    const secret = hotel.wompi_integrity_secret;
    const currency = 'COP';
    const amountInCents = Math.round(amount * 100);
    const chain = `${reference}${amountInCents}${currency}${secret}`;
    const hash = crypto.createHash('sha256').update(chain).digest('hex');

    return {
      success: true,
      signature: hash,
      amountInCents,
      currency,
    };
  } catch (error: any) {
    console.error('[CRITICAL] Error en generación de firma:', error.message);
    return { error: 'Error interno del servidor.' };
  }
}