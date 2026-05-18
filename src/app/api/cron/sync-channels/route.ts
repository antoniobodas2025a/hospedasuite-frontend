export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Interfaz estricta para el contrato de datos
interface HotelRoomInfo {
  hotel_id: string;
}

const qstashClient = new Client({ token: process.env.QSTASH_TOKEN! });

export async function GET(request: Request) {
  try {
    // Barrera de Autorización Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Firma de entorno inválida' }, { status: 401 });
    }

    // Use the safe singleton (build-time compatible)
    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    // Query optimizada: Solo extraemos el hotel_id
    const { data: rooms, error } = await supabaseAdmin
      .from('rooms')
      .select('hotel_id')
      .not('ical_import_url', 'is', null);

    if (error || !rooms) {
      throw new Error(`Fallo de integridad en base de datos: ${error?.message || 'Data nula'}`);
    }

    // Algoritmo de unicidad O(N)
    const uniqueHotelIds = Array.from(new Set(rooms.map((room: any) => room.hotel_id)));

    if (uniqueHotelIds.length === 0) {
      return NextResponse.json({ success: true, dispatched: 0, message: 'Inventario vacío' }, { status: 200 });
    }

    // Construcción del vector de mensajes Fan-Out
    const messages = uniqueHotelIds.map((hotelId) => ({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/qstash/sync-hotel`,
      body: JSON.stringify({ hotelId }),
      headers: { 'Content-Type': 'application/json' },
      retries: 3 // Resiliencia B2B delegada a Upstash
    }));

    // Despacho Atómico
    await qstashClient.batchJSON(messages);

    return NextResponse.json({ success: true, dispatched: messages.length }, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Excepción desconocida';
    console.error('❌ [CRON Dispatcher] Colapso de topología:', errorMessage);
    return NextResponse.json({ success: false, error: 'Fallo interno de despacho' }, { status: 500 });
  }
}