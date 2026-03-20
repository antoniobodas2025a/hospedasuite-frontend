'use server';

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Iniciamos cliente servidor para buscar las claves en la BD
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function generateWompiSignature(
  amount: number,
  reference: string,
) {
  try {
    // 1. Buscamos el secreto de integridad en la base de datos (Hotel Principal)
    const { data: hotel } = await supabase
      .from('hotels')
      .select('wompi_integrity_secret')
      .limit(1)
      .single();

    if (!hotel?.wompi_integrity_secret) {
      return { error: 'No hay clave secreta de Wompi configurada en Ajustes.' };
    }

    const secret = hotel.wompi_integrity_secret;
    const currency = 'COP';

    // Wompi requiere el monto en CENTAVOS (Ej: $10.000 -> 1000000)
    const amountInCents = Math.round(amount * 100);

    // Cadena de Integridad: Referencia + MontoEnCentavos + Moneda + Secreto
    const chain = `${reference}${amountInCents}${currency}${secret}`;

    // Encriptación SHA-256
    const hash = crypto.createHash('sha256').update(chain).digest('hex');

    return {
      success: true,
      signature: hash,
      amountInCents,
      currency,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}
    