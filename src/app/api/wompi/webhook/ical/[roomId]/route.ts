import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos el Service Role para leer las reservas sin necesitar que el usuario esté logueado
// (Booking.com y Airbnb no inician sesión en tu sistema, solo leen esta URL)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> } // Patrón asíncrono de Next.js 15
) {
  try {
    const { roomId } = await params;

    // 1. Validar que la habitación existe
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('name, hotel:hotels(name)')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return new NextResponse('Habitación no encontrada', { status: 404 });
    }

    // @ts-ignore - Supabase tipado anidado
    const hotelName = room.hotel?.name || 'HospedaSuite';

    // 2. Buscar todas las reservas activas para esta habitación
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id, check_in, check_out, status, guests(full_name)')
      .eq('room_id', roomId)
      .in('status', ['confirmed', 'checked_in', 'maintenance']); // Bloqueamos también si está en mantenimiento

    if (bookingsError) {
      return new NextResponse('Error leyendo reservas', { status: 500 });
    }

    // 3. Construir el archivo iCal (Estándar RFC 5545)
    let icalString = `BEGIN:VCALENDAR\r\n`;
    icalString += `VERSION:2.0\r\n`;
    icalString += `PRODID:-//HospedaSuite//${hotelName.replace(/\s+/g, '')}//ES\r\n`;
    icalString += `CALSCALE:GREGORIAN\r\n`;
    icalString += `METHOD:PUBLISH\r\n`;

    // 4. Iterar sobre cada reserva y crear un "Evento"
    bookings?.forEach((booking) => {
      // iCal requiere formato YYYYMMDD para fechas de todo el día
      const formatIcalDate = (dateString: string) => {
        return dateString.replace(/-/g, '');
      };

      const dtStart = formatIcalDate(booking.check_in);
      const dtEnd = formatIcalDate(booking.check_out);
      // @ts-ignore
      const guestName = booking.guests?.full_name || 'Huésped';
      const summary = booking.status === 'maintenance' ? 'Mantenimiento HospedaSuite' : `Reserva HospedaSuite - ${guestName}`;

      icalString += `BEGIN:VEVENT\r\n`;
      icalString += `UID:${booking.id}@hospedasuite.com\r\n`;
      icalString += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\r\n`;
      icalString += `DTSTART;VALUE=DATE:${dtStart}\r\n`;
      icalString += `DTEND;VALUE=DATE:${dtEnd}\r\n`;
      icalString += `SUMMARY:${summary}\r\n`;
      icalString += `DESCRIPTION:Bloqueado por PMS HospedaSuite\r\n`;
      icalString += `END:VEVENT\r\n`;
    });

    icalString += `END:VCALENDAR`;

    // 5. Devolver el archivo con las cabeceras correctas
    return new NextResponse(icalString, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="room-${roomId}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generando iCal:', error);
    return new NextResponse('Error Interno del Servidor', { status: 500 });
  }
}