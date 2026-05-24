import { createClient } from '@/utils/supabase/server';
import { getCurrentHotel } from '@/lib/hotel-context';
import { redirect } from 'next/navigation';
import DashboardPanel from '@/components/dashboard/DashboardPanel';
import OtaSyncWidget from '@/components/dashboard/OtaSyncWidget';
import ReadinessMiniWidget from '@/components/dashboard/ReadinessMiniWidget';
import { getOtaSyncStatusAction } from '@/app/actions/ota-sync';
import { getReadinessAction } from '@/app/actions/readiness';
import { Clock, MessageCircle, AlertTriangle, AlertOctagon, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const hotel = await getCurrentHotel();
  if (!hotel) redirect('/login');

  const supabase = await createClient();

  // 1. DETERMINISMO TEMPORAL ANCLADO (Zona Horaria Colombia / UTC-5)
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  const localDate = new Date(now.getTime() - offsetMs);

  const startOfDay = new Date(localDate);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(startOfDay.getUTCDate() + 1);

  // 2. EJECUCIÓN PARALELA CON DESAMBIGUACIÓN (PGRST201 FIX)
  const [occRes, dirtyRes, posRes, walkInRes, otaSyncRes, readinessRes] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('hotel_id', hotel.id).eq('status', 'checked_in'),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('hotel_id', hotel.id).eq('status', 'dirty'),

    // Ledger POS
    supabase.from('service_items')
      .select('total_price, bookings!inner(hotel_id)')
      .eq('bookings.hotel_id', hotel.id)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString()),

    // Walk-in Payments - 🛡️ REPARACIÓN: Declaración explícita de FK (fk_payments_staff)
    supabase.from('payments')
      .select('amount, staff!fk_payments_staff!inner(hotel_id)')
      .eq('staff.hotel_id', hotel.id)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString()),

    // OTA Sync Status
    getOtaSyncStatusAction(hotel.id),

    // Readiness
    getReadinessAction(hotel.id),
  ]);

  // 3. REDUCCIÓN MATEMÁTICA
  const totalPosRevenue = posRes.data?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;
  const totalWalkInRevenue = walkInRes.data?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const grossRevenue = totalPosRevenue + totalWalkInRevenue;

  // 4. CONTRATO DE DATOS (Payload Serializado)
  const metrics = {
    occupiedRooms: occRes.count || 0,
    dirtyRooms: dirtyRes.count || 0,
    totalPosRevenue,
    totalWalkInRevenue,
    grossRevenue
  };

  const otaStatus = otaSyncRes.success ? otaSyncRes.status : null;

  // Calculate payment lifecycle stage
  const nowDate = new Date();
  const deadline = hotel.trial_ends_at ? new Date(hotel.trial_ends_at) : null;
  const daysUntilDeadline = deadline ? Math.ceil((deadline.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const daysOverdue = deadline ? Math.ceil((nowDate.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const isPendingApproval = hotel.subscription_status === 'pending_approval';
  const isPastDue = hotel.subscription_status === 'past_due';
  const isCancelled = hotel.subscription_status === 'cancelled';

  return (
    <div className="space-y-6">
      {/* Dynamic Payment Lifecycle Banners */}
      {isPendingApproval && daysUntilDeadline !== null && daysUntilDeadline > 2 && (
        <div className="mb-6 p-6 bg-amber-500/5 border border-amber-500/20 rounded-[var(--radius-squircle-2xl)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 bg-amber-500/5 blur-2xl rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="size-12 bg-amber-500/10 text-amber-400 rounded-[var(--radius-squircle-xl)] flex items-center justify-center border border-amber-500/20 shrink-0">
              <Clock size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-amber-400 font-bold text-sm uppercase tracking-wide mb-1">
                Pago en Verificación
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Tu propiedad ya está publicada y visible. Nuestro equipo está verificando tu comprobante de pago manual.
                No necesitas hacer nada más — tu hotel ya funciona con todas las características activas.
              </p>
              <p className="text-white/40 text-xs mt-2">
                La verificación suele tomar menos de 24 horas hábiles.
              </p>
            </div>
            <a
              href="https://wa.me/573213795015"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-squircle-lg)] bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shrink-0"
            >
              <MessageCircle size={16} />
              Contactar Soporte
            </a>
          </div>
        </div>
      )}

      {isPendingApproval && daysUntilDeadline !== null && daysUntilDeadline <= 2 && daysUntilDeadline > 0 && (
        <div className="mb-6 p-6 bg-orange-500/10 border border-orange-500/30 rounded-[var(--radius-squircle-2xl)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 bg-orange-500/10 blur-2xl rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="size-12 bg-orange-500/20 text-orange-400 rounded-[var(--radius-squircle-xl)] flex items-center justify-center border border-orange-500/30 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-orange-400 font-bold text-sm uppercase tracking-wide mb-1">
                ⚠️ Verificación Pendiente
              </h3>
              <p className="text-white/80 text-sm leading-relaxed">
                Quedan {daysUntilDeadline} {daysUntilDeadline === 1 ? 'día' : 'días'} para completar la verificación de tu pago.
                Tu propiedad seguirá activa, pero necesitamos tu comprobante para evitar interrupciones.
              </p>
            </div>
            <a
              href="https://wa.me/573213795015"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-squircle-lg)] bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition-all shrink-0"
            >
              <MessageCircle size={16} />
              Enviar Comprobante
            </a>
          </div>
        </div>
      )}

      {isPastDue && daysOverdue !== null && daysOverdue < 2 && (
        <div className="mb-6 p-6 bg-rose-500/10 border border-rose-500/30 rounded-[var(--radius-squircle-2xl)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 bg-rose-500/10 blur-2xl rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="size-12 bg-rose-500/20 text-rose-400 rounded-[var(--radius-squircle-xl)] flex items-center justify-center border border-rose-500/30 shrink-0">
              <AlertOctagon size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-rose-400 font-bold text-sm uppercase tracking-wide mb-1">
                🔴 Período de Verificación Vencido
              </h3>
              <p className="text-white/80 text-sm leading-relaxed">
                Tu propiedad sigue visible pero con funciones limitadas. Verificá tu pago hoy para evitar que sea ocultada.
              </p>
            </div>
            <a
              href="https://wa.me/573213795015"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-squircle-lg)] bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-all shrink-0"
            >
              <MessageCircle size={16} />
              Urgente: Contactar
            </a>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="mb-6 p-6 bg-zinc-800/50 border border-zinc-700 rounded-[var(--radius-squircle-2xl)] relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="size-12 bg-zinc-700 text-zinc-400 rounded-[var(--radius-squircle-xl)] flex items-center justify-center border border-zinc-600 shrink-0">
              <XCircle size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-zinc-400 font-bold text-sm uppercase tracking-wide mb-1">
                Propiedad Ocultada
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Tu propiedad fue ocultada por falta de verificación de pago. Contactanos para reactivarla.
              </p>
            </div>
            <a
              href="https://wa.me/573213795015"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-squircle-lg)] bg-zinc-600 hover:bg-zinc-500 text-white text-sm font-bold transition-all shrink-0"
            >
              <MessageCircle size={16} />
              Reactivar Cuenta
            </a>
          </div>
        </div>
      )}

      {/* ALERTA VISUAL (Se ocultará si no hay errores) */}
      {(posRes.error || walkInRes.error) && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-2xl)] text-rose-400 text-xs font-mono">
          ⚠️ ERROR DB: {posRes.error?.message || walkInRes.error?.message}
        </div>
      )}

      <DashboardPanel hotelName={hotel.name} metrics={metrics} />

      {/* Readiness MiniWidget */}
      {readinessRes.success && readinessRes.data && (
        <div className="mt-6 max-w-xs">
          <ReadinessMiniWidget
            score={readinessRes.data.score}
            planLabel={readinessRes.data.planLabel}
            hotelId={hotel.id}
          />
        </div>
      )}

      {/* OTA Sync Widget — solo si hay iCal configurado */}
      {otaStatus && (
        <div className="mt-6 max-w-md">
          <OtaSyncWidget initialStatus={otaStatus} hotelId={hotel.id} />
        </div>
      )}
    </div>
  );
}