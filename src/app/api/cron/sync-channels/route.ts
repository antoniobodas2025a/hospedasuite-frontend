import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Client } from '@upstash/qstash';

const getAdminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const qstashClient = new Client({ token: process.env.QSTASH_TOKEN! });

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabaseAdmin = getAdminClient();

    // 1. Obtener lista de Hoteles que tienen al menos una habitación con iCal
    const { data: hotels, error } = await supabaseAdmin
      .from('rooms')
      .select('hotel_id')
      .not('ical_import_url', 'is', null);

    if (error || !hotels) throw new Error('Fallo al extraer inventario global.');

    // 2. Extraer IDs únicos de hoteles
    const uniqueHotelIds = Array.from(new Set(hotels.map(h => h.hotel_id)));

    // 3. Crear el Batch de mensajes para QStash
    const messages = uniqueHotelIds.map((hotelId) => ({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/qstash/sync-hotel`,
      body: JSON.stringify({ hotelId }),
      headers: { 'Content-Type': 'application/json' },
      retries: 3
    }));

    // 4. Disparo Fan-Out
    if (messages.length > 0) {
      await qstashClient.batchJSON(messages);
    }

    return NextResponse.json({ success: true, dispatched: messages.length }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [CRON Dispatcher] Colapso:', error.message);
    return NextResponse.json({ success: false, error: 'Fallo interno' }, { status: 500 });
  }
}