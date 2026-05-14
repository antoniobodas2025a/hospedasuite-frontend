/**
 * ⏰ Cron Job: Enviar email reminder 7 días antes de que expire el trial
 *
 * Se ejecuta diariamente (vía Vercel Cron o Upstash QStash).
 * Busca hoteles con trial_ends_at entre hoy+7 y hoy+8 días.
 * Envía email de recordatorio vía Resend.
 *
 * URL: /api/cron/trial-reminders
 * Protegido por CRON_SECRET header.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

// Inicializar Resend solo si la API key existe
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function GET(request: Request) {
  // 1. Verificar que la llamada viene del cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!resend) {
    console.warn('[CRON] RESEND_API_KEY no configurada. Emails no enviados.');
    return NextResponse.json({ error: 'Resend no configurado' }, { status: 500 });
  }

  try {
    // 2. Calcular ventana de 7 días (hoy+7 a hoy+8)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const eightDaysFromNow = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

    // 3. Buscar hoteles cuyo trial expira en esa ventana
    const { data: reminderHotels, error: fetchError } = await supabaseAdmin
      .from('hotels')
      .select('id, name, email, subscription_status, trial_ends_at')
      .eq('subscription_status', 'trialing')
      .gte('trial_ends_at', sevenDaysFromNow.toISOString())
      .lt('trial_ends_at', eightDaysFromNow.toISOString());

    if (fetchError) {
      console.error('[CRON] Error buscando trials por expirar:', fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!reminderHotels || reminderHotels.length === 0) {
      console.log('[CRON] No hay trials por expirar en los próximos 7 días.');
      return NextResponse.json({ sent: 0, message: 'Sin reminders pendientes' });
    }

    console.log(`[CRON] ${reminderHotels.length} reminder(s) para enviar.`);

    // 4. Enviar emails
    let sent = 0;
    for (const hotel of reminderHotels) {
      if (!hotel.email) {
        console.warn(`[CRON] Hotel ${hotel.id} sin email. Skip.`);
        continue;
      }

      const trialEndDate = new Date(hotel.trial_ends_at).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'HospedaSuite <reservas@hospedasuite.com>',
          to: [hotel.email],
          subject: `🔔 Tu trial de HospedaSuite termina en 7 días`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hola, ${hotel.name || 'equipo'} 👋</h2>
              <p>Tu período de prueba gratuito de <strong>HospedaSuite</strong> termina el <strong>${trialEndDate}</strong>.</p>
              <p>Para seguir disfrutando de todas las funcionalidades, seleccioná un plan:</p>
              <ul>
                <li><strong>Starter</strong> — $49.000 COP/mes</li>
                <li><strong>Pro</strong> — $99.000 COP/mes</li>
                <li><strong>Enterprise</strong> — $169.000 COP/mes</li>
              </ul>
              <p style="margin-top: 24px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.hospedasuite.com'}/dashboard/billing"
                   style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Ver planes y actualizar →
                </a>
              </p>
              <p style="color: #666; font-size: 12px; margin-top: 32px;">
                Si tenés dudas, escribinos a soporte@hospedasuite.com
              </p>
            </div>
          `,
        });
        sent++;
        console.log(`[CRON] Email enviado a ${hotel.email} (${hotel.name})`);
      } catch (emailError: any) {
        console.error(`[CRON] Error enviando email a ${hotel.email}:`, emailError.message);
      }
    }

    return NextResponse.json({
      sent,
      total: reminderHotels.length,
      hotels: reminderHotels.map(h => ({ id: h.id, name: h.name, email: h.email })),
    });
  } catch (error: any) {
    console.error('[CRON] Error procesando reminders:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
