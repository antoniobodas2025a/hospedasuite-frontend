'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// 🛡️ 1. FÁBRICA DE CLIENTE DIOS (Aislada, no exportada)
const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
};

export async function syncChannelManagerAction(hotelId: string) {
  try {
    // 🚨 BARRERA ZERO-TRUST: Verificar sesión y permisos ANTES de actuar
    const cookieStore = await cookies();
    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* Los Server Actions no deben setear cookies aquí */ },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      throw new Error('No autorizado. Sesión inválida.');
    }

    // Verificamos propiedad del hotel mediante RLS (Si no es su hotel, falla)
    const { data: hotelAccess, error: accessError } = await supabaseUser
      .from('hotels')
      .select('id')
      .eq('id', hotelId)
      .single();

    if (accessError || !hotelAccess) {
      throw new Error('Violación de seguridad: No tiene permisos sobre este hotel.');
    }

    // Pasamos la barrera. Usamos el cliente Admin para el trabajo pesado (Ignora RLS para inserciones masivas).
    const supabaseAdmin = getAdminClient();
    
    // 📦 IMPORTACIÓN DINÁMICA (Antídoto para Turbopack y e.BigInt)
    const ical = (await import('node-ical')).default || await import('node-ical');

    // 1. Buscamos habitaciones con URLs de importación configuradas
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('id, name, ical_import_url')
      .eq('hotel_id', hotelId)
      .not('ical_import_url', 'is', null);

    if (roomsError) throw new Error('Error al buscar el inventario del hotel.');
    
    if (!rooms || rooms.length === 0) {
      return { success: true, message: 'No hay enlaces iCal de Booking/Airbnb configurados en las habitaciones.' };
    }

    let importedCount = 0;

    // 🛡️ 2. RESTAURACIÓN DE INTEGRIDAD RELACIONAL (Evita fallos de FK Constraint)
    // Buscamos o creamos el Huésped Genérico para la OTA
    let { data: otaGuest } = await supabaseAdmin
      .from('guests')
      .select('id')
      .eq('hotel_id', hotelId)
      .eq('doc_number', 'OTA-GUEST-000')
      .single();

    if (!otaGuest) {
      const { data: newGuest, error: guestInsertError } = await supabaseAdmin.from('guests').insert([{
        hotel_id: hotelId,
        full_name: 'Reserva Externa (Booking/Airbnb)',
        doc_number: 'OTA-GUEST-000',
        phone: 'N/A'
      }]).select('id').single();
      
      if (guestInsertError) throw new Error('No se pudo inicializar la entidad puente OTA.');
      otaGuest = newGuest;
    }

    // 3. Iterar sobre cada habitación de forma secuencial
    for (const room of rooms) {
      if (!room.ical_import_url || room.ical_import_url.trim() === '') continue;

      try {
        // Descargamos y parseamos el calendario de la OTA
        const events = await ical.async.fromURL(room.ical_import_url);

        for (const event of Object.values(events)) {
          if (event.type === 'VEVENT') {
            const externalId = event.uid;
            const checkInDate = new Date(event.start as Date);
            const checkOutDate = new Date(event.end as Date);
            
            const checkIn = checkInDate.toISOString().split('T')[0];
            const checkOut = checkOutDate.toISOString().split('T')[0];

            // Evitamos procesar eventos del pasado
            const today = new Date().toISOString().split('T')[0];
            if (checkOut <= today) continue; 

            // Verificamos si esta reserva de OTA ya existe en nuestra base de datos (Deduplicación)
            const { data: existingBooking } = await supabaseAdmin
              .from('bookings')
              .select('id')
              .eq('external_id', externalId)
              .single();

            if (!existingBooking) {
              // 🛡️ Prevenir colisión: Insertamos asegurando el guest_id
              const { error: insertError } = await supabaseAdmin.from('bookings').insert([{
                hotel_id: hotelId,
                room_id: room.id,
                guest_id: otaGuest.id, // Llave foránea restaurada
                check_in: checkIn,
                check_out: checkOut,
                status: 'blocked_ota', // Diferenciador de OTA
                total_price: 0, 
                external_id: externalId
              }]);
              
              if (insertError) {
                console.error(`[SEC-OPS] Fallo de inserción OTA para hab ${room.id}:`, insertError);
              } else {
                importedCount++;
              }
            }
          }
        }
      } catch (icalError) {
        // Si falla una habitación (ej. URL rota de Airbnb), registramos y continuamos
        console.error(`[SEC-OPS] Error procesando iCal para la habitación ${room.name}:`, icalError);
      }
    }

    // Limpiamos la caché del frontend para que el calendario se actualice al instante
    revalidatePath('/dashboard/calendar');
    
    return { 
      success: true, 
      message: importedCount > 0 
        ? `Sincronización exitosa. Se bloquearon ${importedCount} nuevas fechas desde las OTAs.` 
        : `Inventario sincronizado. No hay nuevas reservas externas.` 
    };

  } catch (error: any) {
    console.error('[SEC-OPS] Error fatal en Channel Manager:', error);
    return { success: false, error: error.message };
  }
}