'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// 🚨 1. FÁBRICA SEGURA DE CLIENTES (Elimina el choque global)
const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
};

export async function syncChannelManagerAction(hotelId: string) {
  try {
    const supabaseAdmin = getAdminClient();
    
    // 🚨 2. EL ANTÍDOTO (IMPORTACIÓN DINÁMICA)
    // Al importar node-ical AQUÍ ADENTRO, evitamos que Turbopack 
    // lo analice al iniciar el servidor, erradicando el error e.BigInt.
    const ical = (await import('node-ical')).default || await import('node-ical');

    // 1. Buscamos todas las habitaciones del hotel que tengan un enlace iCal configurado
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('id, name, ical_import_url')
      .eq('hotel_id', hotelId)
      .not('ical_import_url', 'is', null);

    if (roomsError) throw new Error('Error al buscar habitaciones');
    if (!rooms || rooms.length === 0) {
      return { success: true, message: 'No hay enlaces iCal configurados en las habitaciones.' };
    }

    let importedCount = 0;

    // 2. Buscamos o creamos un "Huésped Genérico" para asignar estas reservas externas
    let { data: otaGuest } = await supabaseAdmin
      .from('guests')
      .select('id')
      .eq('hotel_id', hotelId)
      .eq('doc_number', 'OTA-GUEST-000')
      .single();

    if (!otaGuest) {
      const { data: newGuest } = await supabaseAdmin.from('guests').insert([{
        hotel_id: hotelId,
        full_name: 'Reserva Externa (Booking/Airbnb)',
        doc_number: 'OTA-GUEST-000',
        phone: 'N/A'
      }]).select().single();
      otaGuest = newGuest;
    }

    // 3. Procesamos cada habitación
    for (const room of rooms) {
      if (!room.ical_import_url || room.ical_import_url.trim() === '') continue;

      try {
        // Descargamos y parseamos el iCal desde la URL de Airbnb/Booking
        const events = await ical.async.fromURL(room.ical_import_url);
        
        for (const event of Object.values(events)) {
          if (event.type === 'VEVENT') {
            const externalId = event.uid; 
            
            // Protección de Fechas nativas
            const checkInDate = new Date(event.start);
            const checkOutDate = new Date(event.end);
            
            const checkIn = checkInDate.toISOString().split('T')[0];
            const checkOut = checkOutDate.toISOString().split('T')[0];

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
                guest_id: otaGuest?.id,
                check_in: checkIn,
                check_out: checkOut,
                status: 'confirmed',
                total_price: 0, 
                external_id: externalId 
              }]);
              importedCount++;
            }
          }
        }
      } catch (icalError) {
        console.error(`Error procesando iCal para cuarto ${room.name}:`, icalError);
      }
    }

    revalidatePath('/dashboard/calendar');
    
    return { 
      success: true, 
      message: importedCount > 0 
        ? `Sincronización exitosa. Se importaron ${importedCount} nuevas reservas.` 
        : `Todo está al día. No se encontraron nuevas reservas.` 
    };

  } catch (error: any) {
    console.error('Error en Channel Manager:', error);
    return { success: false, error: error.message };
  }
}