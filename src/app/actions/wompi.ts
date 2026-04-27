'use server';

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * 🛡️ MOTOR CRIPTOGRÁFICO POLIMÓRFICO (Tier-0 y Tier-1)
 * Si se provee hotelId, firma con el secreto del Tenant (El hotel le cobra al huésped).
 * Si hotelId es undefined, firma con el secreto de HQ (HospedaSuite le cobra al hotel).
 */
export async function generateWompiSignature(
  amount: number,
  reference: string,
  hotelId?: string 
) {
  try {
    let secret = '';

    if (hotelId) {
      // CONTEXTO TIER-1: Facturación del Hotel
      const { data: hotel, error: hotelError } = await supabaseAdmin
        .from('hotels')
        .select('wompi_integrity_secret')
        .eq('id', hotelId)
        .single();

      if (hotelError || !hotel?.wompi_integrity_secret) {
        throw new Error('TENANT_SECRET_MISSING: El hotel no ha configurado su pasarela Wompi.');
      }
      secret = hotel.wompi_integrity_secret;
    } else {
      // CONTEXTO TIER-0: Onboarding SaaS (HospedaSuite)
      secret = process.env.HQ_WOMPI_INTEGRITY_SECRET!;
      if (!secret) {
        throw new Error('HQ_SECRET_MISSING: Secreto global de HospedaSuite no configurado en entorno.');
      }
    }

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
    console.error('🚨 WOMPI_CRYPTO_ERROR:', error.message);
    return { success: false, error: error.message };
  }
}