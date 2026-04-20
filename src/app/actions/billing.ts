'use server';

import { createClient } from '@supabase/supabase-js';
import { getCurrentHotel } from '@/lib/hotel-context';

// Cliente privilegiado para bypassear RLS en cálculos internos
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 💰 DICCIONARIO INMUTABLE DE PRECIOS SAAS
const SAAS_PLANS: Record<string, number> = {
  micro: 59900,
  standard: 99900,
  pro: 189900,
};

export interface BillingStatement {
  hotelName: string;
  planName: string;
  subscriptionFee: number;
  platformFeesTotal: number; // Suma de OTA (10%) + Upsell (3%)
  totalDue: number;
  bookingsCount: number;
  period: string;
}

export async function getHotelBillingAction() {
  try {
    // 1. Identidad Criptográfica del Tenant Actual
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) throw new Error('Fallo de Autenticación: Identidad del hotel no verificada.');

    // 2. Extracción de Plan de Suscripción
    const { data: hotel, error: hotelError } = await supabaseAdmin
      .from('hotels')
      .select('id, name, subscription_plan')
      .eq('id', currentHotel.id)
      .single();

    if (hotelError || !hotel) throw new Error('Error de integridad: Datos de facturación del hotel corruptos.');

    // 3. Barrido Financiero del Mes Actual (🛡️ CORRECCIÓN TIMEZONE: Aislando UTC-5 Colombia)
    const now = new Date();
    const colTimeStr = now.toLocaleString("en-US", { timeZone: "America/Bogota" });
    const colTime = new Date(colTimeStr);
    
    // Fijamos el día 1 del mes actual a las 00:00:00 hora local de Colombia
    const startOfMonth = new Date(colTime.getFullYear(), colTime.getMonth(), 1, 0, 0, 0);

    // 4. Extracción de Ledger (🛡️ CORRECCIÓN DE ESTADO: Ignorar reservas canceladas)
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('platform_fee')
      .eq('hotel_id', currentHotel.id)
      .neq('status', 'cancelled') // BARRERA ANTI-SOBREFACTURACIÓN
      .gte('created_at', startOfMonth.toISOString());

    if (bookingsError) throw new Error('Error al calcular el libro mayor de comisiones.');

    // 5. Consolidación de Deuda (Zero-Trust Math)
    const platformFeesTotal = bookings.reduce((sum, b) => sum + Number(b.platform_fee || 0), 0);
    const planKey = hotel.subscription_plan?.toLowerCase() || 'none';
    const subscriptionFee = SAAS_PLANS[planKey] || 0;
    
    const totalDue = subscriptionFee + platformFeesTotal;

    // 6. Formateador de meses agnóstico para servidores Vercel/Node
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const periodString = `${monthNames[colTime.getMonth()]} ${colTime.getFullYear()}`;

    const statement: BillingStatement = {
      hotelName: hotel.name,
      planName: planKey === 'none' ? 'No Asignado' : planKey.toUpperCase(),
      subscriptionFee,
      platformFeesTotal,
      totalDue,
      bookingsCount: bookings.length,
      period: periodString
    };

    return { success: true, statement };
  } catch (error: any) {
    console.error('[SEC-OPS] Fallo en facturación B2B:', error.message);
    return { success: false, error: error.message };
  }
}
