export const dynamic = 'force-dynamic';
/**
 * ⏰ Cron Job: Detectar trials expirados y marcar como past_due
 *
 * Se ejecuta diariamente (vía Vercel Cron o Upstash QStash).
 * Busca hoteles con subscription_status='trialing' donde trial_ends_at < NOW()
 * y los marca como past_due.
 *
 * URL: /api/cron/expired-trials
 * Protegido por CRON_SECRET header.
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logAuditEvent } from '@/lib/audit-logger';
import { trackTrialExpired } from '@/lib/analytics-server';


export async function GET(request: Request) {
  // 1. Verificar que la llamada viene del cron (no de un usuario)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // 2. Buscar hoteles con trial expirado
    const { data: expiredHotels, error: fetchError } = await supabaseAdmin
      .from('hotels')
      .select('id, name, email, subscription_status, subscription_plan, trial_ends_at, created_at')
      .eq('subscription_status', 'trialing')
      .lt('trial_ends_at', new Date().toISOString());

    if (fetchError) {
      console.error('[CRON] Error buscando trials expirados:', fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiredHotels || expiredHotels.length === 0) {
      console.log('[CRON] No hay trials expirados para procesar.');
      return NextResponse.json({ processed: 0, message: 'Sin trials expirados' });
    }

    console.log(`[CRON] ${expiredHotels.length} trial(s) expirado(s) encontrado(s).`);

    // 3. Marcar como past_due
    const hotelIds = expiredHotels.map((h: any) => h.id);
    const { error: updateError } = await supabaseAdmin
      .from('hotels')
      .update({ subscription_status: 'past_due' })
      .in('id', hotelIds);

    if (updateError) {
      console.error('[CRON] Error actualizando hotels:', updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`[CRON] ${hotelIds.length} hotel(es) marcados como past_due.`);

    // 📝 Audit log: trials expirados
    for (const hotel of expiredHotels) {
      await logAuditEvent({
        actor_type: 'cron',
        actor_id: 'expired-trials-check',
        action: 'trial_expired',
        entity_type: 'hotel',
        entity_id: hotel.id,
        old_value: { subscription_status: 'trialing', trial_ends_at: hotel.trial_ends_at },
        new_value: { subscription_status: 'past_due' },
      });

      // 📊 Analytics: trial expired
      const daysInTrial = hotel.trial_ends_at
        ? Math.floor((new Date(hotel.trial_ends_at).getTime() - new Date(hotel.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24))
        : 90;
      await trackTrialExpired(hotel.id, daysInTrial, hotel.subscription_plan || 'starter');
    }

    return NextResponse.json({
      processed: hotelIds.length,
      hotels: expiredHotels.map((h: any) => ({ id: h.id, name: h.name })),
    });
  } catch (error: any) {
    console.error('[CRON] Error procesando trials expirados:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
