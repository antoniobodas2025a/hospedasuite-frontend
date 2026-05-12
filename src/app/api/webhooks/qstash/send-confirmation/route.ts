// ============================================================================
// ⚙️ QSTASH WORKER: Envío de confirmación de reserva
//
// Procesa emails de confirmación de forma asíncrona con reintentos
// automáticos. QStash reintenta hasta 3 veces si falla.
//
// Reemplaza el envío inline que estaba en el webhook de Wompi.
// ============================================================================

import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { Resend } from 'resend';
import { BookingVoucher } from '@/emails/BookingVoucher';

// Tipado del payload que recibe desde el webhook de Wompi
interface ConfirmationPayload {
  guestEmail: string;
  guestName: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  roomName: string;
  bookingId: string;
  amount: number;
}

const resend = new Resend(process.env.RESEND_API_KEY);

async function handler(req: Request) {
  try {
    const payload: ConfirmationPayload = await req.json();

    // Validación de contrato
    if (!payload.guestEmail || !payload.bookingId) {
      return NextResponse.json(
        { error: 'Payload incompleto: faltan campos requeridos' },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: [payload.guestEmail],
      subject: `✅ Confirmación de Reserva - ${payload.hotelName}`,
      react: BookingVoucher({
        guestName: payload.guestName,
        hotelName: payload.hotelName,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        roomName: payload.roomName,
        reference: payload.bookingId,
        total: payload.amount,
      }),
    });

    if (error) {
      console.error(
        `❌ [QSTASH WORKER] Resend error para booking ${payload.bookingId}:`,
        error.message
      );
      // Devolver 500 para que QStash reintente
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(
      `✅ [QSTASH WORKER] Confirmación enviada a ${payload.guestEmail} para booking ${payload.bookingId}`
    );
    return NextResponse.json({ success: true, id: data?.id }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ [QSTASH WORKER] Error crítico:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
