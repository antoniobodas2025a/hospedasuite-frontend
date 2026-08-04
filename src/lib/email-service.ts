import { Resend } from 'resend';
import { render } from '@react-email/render';
import { HotelApproved } from '@/emails/HotelApproved';
import { HotelRejected } from '@/emails/HotelRejected';

// ============================================================================
// EMAIL SERVICE - Single Responsibility for email sending
// ============================================================================

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: 'HospedaSuite <noreply@hospedasuite.com>',
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

// ============================================================================
// PUBLIC API - Domain-specific email functions
// ============================================================================

interface HotelEmailData {
  name: string;
  slug?: string;
  owner_email: string;
}

export async function sendHotelApprovedEmail(hotel: HotelEmailData): Promise<boolean> {
  const html = render(HotelApproved({
    hotelName: hotel.name,
    hotelSlug: hotel.slug || '',
  }));

  return sendEmail({
    to: hotel.owner_email,
    subject: '🎉 ¡Tu hotel ha sido aprobado!',
    html,
  });
}

export async function sendHotelRejectedEmail(
  hotel: HotelEmailData,
  reason?: string,
): Promise<boolean> {
  const html = render(HotelRejected({
    hotelName: hotel.name,
    rejectionReason: reason || 'La solicitud no cumple con los requisitos de la plataforma.',
  }));

  return sendEmail({
    to: hotel.owner_email,
    subject: 'Solicitud de hotel no aprobada',
    html,
  });
}
