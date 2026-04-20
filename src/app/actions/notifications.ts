'use server';

import { Resend } from 'resend';
import { BookingVoucher } from '@/emails/BookingVoucher';

// Tipado estricto para prevenir colapsos en el renderizado del template
interface VoucherPayload {
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

export async function sendBookingConfirmationEmail(data: VoucherPayload) {
  try {
    const { data: resendData, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: [data.guestEmail],
      subject: `Confirmación de Reserva - ${data.hotelName}`,
      react: BookingVoucher({
        guestName: data.guestName,
        hotelName: data.hotelName,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        roomName: data.roomName,
        reference: data.bookingId,
        total: data.amount
      }),
    });

    // Control de Soft-Errors nativos del SDK de Resend (4xx)
    if (error) {
      throw new Error(error.message);
    }
    
    return { success: true, id: resendData?.id };
  } catch (error: any) {
    console.error('❌ [Notificaciones] Error disparando email Resend:', error.message || error);
    return { success: false };
  }
}