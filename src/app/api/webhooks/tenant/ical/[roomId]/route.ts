import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 🛡️ FÁBRICA DE CLIENTE DIOS (Aislada por request para evitar fugas de memoria en Serverless)
const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> } // 🛡️ Zero-Trust: Token Criptográfico Anti-Espionaje
) {
  try {
    const { token } = await params;

    // 🚨 1. Validación temprana del Token
    if (!token || token.length < 10) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    const supabaseAdmin = getAdminClient();

    // 🛡️ 2. Resolución de Token (Zero-Trust)
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, name, hotel:hotels(name)')
      .eq('ical_export_token', token)
      .single();

    if (roomError || !room) {
      // Retornamos 404 genérico para no dar pistas al atacante
      return new NextResponse('Recurso no encontrado', { status: 404 });
    }

    // Aserción de tipos segura (Saneamiento de Any)
    const hotelData = room.hotel as unknown as { name?: string };
    const hotelName = hotelData?.name || 'HospedaSuite';

    // 3. Buscar todas las reservas activas (Saneado lógicamente y PII aislado)
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id, check_in, check_out, status')
      .eq('room_id', room.id)
      .in('status', ['confirmed', 'checked_in', 'checked_out', 'maintenance', 'blocked_ota']); 

    if (bookingsError) {
      console.error(`[SEC-OPS] Error DB iCal Export para Habitación ${room.id}:`, bookingsError);
      return new NextResponse('Error interno', { status: 500 });
    }

    // 4. Iniciar el formato iCalendar estandarizado (RFC 5545)
    let icalString = `BEGIN:VCALENDAR\r\n`;
    icalString += `VERSION:2.0\r\n`;
    icalString += `PRODID:-//HospedaSuite//${hotelName.replace(/\s+/g, '')}//ES\r\n`;
    icalString += `CALSCALE:GREGORIAN\r\n`;
    icalString += `METHOD:PUBLISH\r\n`;

    // 5. Agregar cada reserva como un evento (VEVENT) anonimizado
    if (bookings && bookings.length > 0) {
      bookings.forEach((booking) => {
        const formatIcalDate = (dateString: string) => dateString.replace(/-/g, '');

        const dtStart = formatIcalDate(booking.check_in);
        const dtEnd = formatIcalDate(booking.check_out);

        // 🛡️ Anonimización estricta. Cero fuga de datos de clientes.
        const summary = booking.status === 'maintenance' 
          ? 'Mantenimiento HospedaSuite' 
          : 'Reservado - HospedaSuite';

        icalString += `BEGIN:VEVENT\r\n`;
        icalString += `UID:${booking.id}@hospedasuite.com\r\n`;
        icalString += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\r\n`;
        icalString += `DTSTART;VALUE=DATE:${dtStart}\r\n`;
        icalString += `DTEND;VALUE=DATE:${dtEnd}\r\n`;
        icalString += `SUMMARY:${summary}\r\n`;
        icalString += `DESCRIPTION:Bloqueado por motor principal\r\n`;
        icalString += `END:VEVENT\r\n`;
      });
    }

    icalString += `END:VCALENDAR`;

    // 6. Devolver el archivo con las cabeceras de Anti-Caché (Prevención Double-Booking)
    return new NextResponse(icalString, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="sync-${token.substring(0, 8)}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[SEC-OPS] Error fatal generando iCal:', error);
    return new NextResponse('Error interno', { status: 500 });
  }
}