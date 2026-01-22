import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import ical from 'https://esm.sh/node-ical';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    // 1. Iniciar Supabase Admin (para poder escribir en todas las tablas)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Iniciando Sincronización Multicanal...');

    // 2. Traer todas las conexiones activas
    // OJO: Podrías filtrar por 'sync_status' != 'paused' si quisieras pausar algunas
    const { data: connections, error: connError } = await supabase
      .from('calendar_connections')
      .select('id, room_id, platform, ical_url, hotel_id:rooms(hotel_id)');
    // Nota: Hacemos join con rooms para saber el hotel_id

    if (connError)
      throw new Error(`Error leyendo conexiones: ${connError.message}`);

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No hay calendarios configurados.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    let successCount = 0;
    let failCount = 0;

    // 3. Iterar sobre cada conexión INDIVIDUALMENTE
    for (const conn of connections) {
      try {
        console.log(
          `📡 Sincronizando ${conn.platform} para Room ${conn.room_id}...`,
        );

        // A. Descargar el archivo .ics
        const response = await fetch(conn.ical_url);

        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}`);
        }

        const icsData = await response.text();
        const events = ical.parseICS(icsData);
        let bookingsFound = 0;

        // B. Procesar Eventos
        for (const k in events) {
          const ev = events[k];
          if (ev.type === 'VEVENT' && ev.start && ev.end) {
            const checkIn = ev.start.toISOString().split('T')[0];
            const checkOut = ev.end.toISOString().split('T')[0];
            const externalId = ev.uid || k;

            // C. Insertar Reserva en la tabla principal
            // Usamos UPSERT: Si el external_id ya existe, no hace nada (o actualiza fechas)
            const { error: upsertError } = await supabase
              .from('bookings')
              .upsert(
                {
                  hotel_id: conn.hotel_id.hotel_id, // Obtenido del join
                  room_id: conn.room_id,
                  external_id: externalId,
                  check_in: checkIn,
                  check_out: checkOut,
                  status: 'occupied',
                  source: conn.platform, // 'airbnb', 'booking'
                  notes: `Importado de ${conn.platform}`,
                  total_price: 0,
                },
                { onConflict: 'external_id' },
              );

            if (upsertError)
              console.error(
                `Error guardando reserva ${externalId}:`,
                upsertError,
              );
            else bookingsFound++;
          }
        }

        // D. ÉXITO: Actualizar el estado de la conexión
        await supabase
          .from('calendar_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            sync_status: 'success',
            error_message: null, // Limpiamos errores previos
          })
          .eq('id', conn.id);

        successCount++;
      } catch (err) {
        // E. FALLO: Registrar el error en la conexión específica
        console.error(`Fallo en conexión ${conn.id}:`, err);

        await supabase
          .from('calendar_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            sync_status: 'error',
            error_message: err.message || 'Error desconocido',
          })
          .eq('id', conn.id);

        failCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: connections.length,
        ok: successCount,
        errors: failCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
