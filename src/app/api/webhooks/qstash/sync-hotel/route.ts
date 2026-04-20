import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

const getAdminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function handler(req: Request) {
  try {
    const payload = await req.json();
    const hotelId = payload.hotelId;

    if (!hotelId) return NextResponse.json({ error: 'Falta hotelId' }, { status: 400 });

    console.log(`⚙️ [QSTASH WORKER] Sincronizando Hotel: ${hotelId}`);
    const supabaseAdmin = getAdminClient();
    const ical = (await import('node-ical')).default || await import('node-ical');

    // 1. Obtener habitaciones SOLO de este hotel
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('id, name, hotel_id, ical_import_url')
      .eq('hotel_id', hotelId)
      .not('ical_import_url', 'is', null);

    if (roomsError || !rooms) throw new Error('Fallo al extraer habitaciones del hotel.');

    // 2. Caché local del huésped genérico (Aislado a esta ejecución)
    let guestId: string | null = null;
    
    // 3. Resolución de Integridad Relacional
    const { data: otaGuest } = await supabaseAdmin
      .from('guests')
      .select('id')
      .eq('hotel_id', hotelId)
      .eq('doc_number', 'OTA-GUEST-000')
      .single();

    if (otaGuest) {
      guestId = otaGuest.id;
    } else {
      const { data: newGuest } = await supabaseAdmin.from('guests').insert([{
        hotel_id: hotelId,
        full_name: 'Reserva Externa (Booking/Airbnb)',
        doc_number: 'OTA-GUEST-000',
        phone: 'N/A'
      }]).select('id').single();
      guestId = newGuest?.id || null;
    }

    if (!guestId) throw new Error('Imposible resolver huésped OTA.');

    let totalImported = 0;

    // 4. Parseo y Bloqueo (Solo iteramos las habitaciones de este hotel)
    for (const room of rooms) {
      if (!room.ical_import_url || room.ical_import_url.trim() === '') continue;

      try {
        const events = await ical.async.fromURL(room.ical_import_url);
        
        for (const event of Object.values(events)) {
          if (event.type === 'VEVENT') {
            const externalId = event.uid;
            const checkIn = new Date(event.start as Date).toISOString().split('T')[0];
            const checkOut = new Date(event.end as Date).toISOString().split('T')[0];
            const today = new Date().toISOString().split('T')[0];

            if (checkOut <= today) continue;

            const { data: existingBooking } = await supabaseAdmin
              .from('bookings')
              .select('id')
              .eq('external_id', externalId)
              .single();

            if (!existingBooking) {
              await supabaseAdmin.from('bookings').insert([{
                hotel_id: hotelId,
                room_id: room.id,
                guest_id: guestId, 
                check_in: checkIn,
                check_out: checkOut,
                status: 'blocked_ota',
                total_price: 0,
                external_id: externalId
              }]);
              totalImported++;
            }
          }
        }
      } catch (icalError: any) {
         console.warn(`⚠️ [WORKER] Error ical en Hab. ${room.id}:`, icalError.message);
      }
    }

    return NextResponse.json({ success: true, imported: totalImported }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [QSTASH WORKER] Fallo crítico:', error.message);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);