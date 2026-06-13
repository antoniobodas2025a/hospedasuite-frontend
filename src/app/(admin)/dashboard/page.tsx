import { createClient } from '@/utils/supabase/server';
import { getCurrentHotel } from '@/lib/hotel-context';
import { redirect } from 'next/navigation';
import DashboardPanel from '@/components/dashboard/DashboardPanel';
import OtaSyncWidget from '@/components/dashboard/OtaSyncWidget';
import ReadinessMiniWidget from '@/components/dashboard/ReadinessMiniWidget';
import PostGoLiveMetrics from '@/components/dashboard/PostGoLiveMetrics';
import { getOtaSyncStatusAction } from '@/app/actions/ota-sync';
import { getReadinessAction } from '@/app/actions/readiness';
import { simulateBookingAction } from '@/app/actions/bookings';
import { Clock, MessageCircle, AlertTriangle, AlertOctagon, XCircle, PlayCircle, ArrowUpRight, CheckCircle, TrendingUp } from 'lucide-react';

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

    // Channel Sync Status
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

      {/* Guía de Activación rápida si falta Wompi */}
      {readinessRes.success && readinessRes.data && readinessRes.data.score < 100 && (
        <div className="mt-6 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[var(--radius-squircle-2xl)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 bg-emerald-500/5 blur-2xl rounded-full pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-wide mb-2 flex items-center gap-2">
              🚀 Completá tu configuración para activar el Motor Propio
            </h3>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Te falta poco para empezar a recibir reservas directas. 
              Revisá qué pasos están pendientes:
            </p>
            <a
              href="/dashboard/readiness"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-squircle-lg)] bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              Ver pasos pendientes →
            </a>
          </div>
        </div>
      )}

      {/* Botón Maestro de Activación (Ley de Hick) — Solo si Readiness 100% y no está activo */}
      {readinessRes.success && readinessRes.data && readinessRes.data.score === 100 && !hotel.go_live && (
        <div className="mt-6 p-8 bg-gradient-to-r from-brand-500/20 to-emerald-500/20 border-2 border-brand-500/40 rounded-3xl relative overflow-hidden shadow-2xl shadow-brand-500/10">
          <div className="absolute top-0 right-0 p-24 bg-brand-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-brand-300 font-bold text-lg uppercase tracking-widest mb-2">
                🟢 Todo listo para el Go-Live
              </h3>
              <p className="text-white/80 text-base leading-relaxed">
                Tu Motor Propio está configurado y verificado. 
                Un solo clic para empezar a recibir reservas reales.
              </p>
            </div>
            {/* TODO: Re-enable Go Live action after build fix */}
            <button
              disabled
              className="px-8 py-4 bg-gray-500 text-white text-lg font-bold rounded-2xl cursor-not-allowed flex items-center gap-3"
            >
              <span>Activar Motor Propio (Mantenimiento)</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner de Estado "En Vivo" */}
      {hotel.go_live && (
        <div className="space-y-6">
          <div className="mt-6 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle size={20} />
            </div>
            <div>
              <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-wide">Motor Propio Activo</h3>
              <p className="text-white/60 text-sm">Tu ecosistema está operando y recibiendo reservas.</p>
            </div>
          </div>

          {/* Post-Go-Live Monitoring Dashboard */}
          <PostGoLiveMetrics hotelId={hotel.id} />

          {/* Upselling Module — Coming Soon */}
          <div className="mt-6 p-6 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-purple-400 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                Upselling Agéntico
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded-full font-bold">PRÓXIMAMENTE</span>
              </h3>
              <p className="text-white/60 text-sm mt-1">
                Prepárate para vender paquetes, experiencias y servicios extra. El sistema te avisará cuando esté listo para generar esos $40 USD adicionales por reserva.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Channel Sync Widget — solo si hay iCal configurado */}
      {otaStatus && (
        <div className="mt-6 max-w-md">
          <OtaSyncWidget initialStatus={otaStatus} hotelId={hotel.id} />
        </div>
      )}

      {/* Simulador de Reserva — Para que el hotelero pruebe el flujo */}
      <div className="mt-8 p-6 bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/20 rounded-[var(--radius-squircle-2xl)]">
        <div className="flex items-start gap-4">
          <div className="size-12 bg-brand-500/20 text-brand-400 rounded-[var(--radius-squircle-xl)] flex items-center justify-center border border-brand-500/30 shrink-0">
            <PlayCircle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-brand-400 font-bold text-sm uppercase tracking-wide mb-1">
              Simulador de Reserva
            </h3>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Probá el flujo completo de reserva con $1.000 COP de prueba. 
              Esto crea una reserva CONFIRMED y un pago TEST para que veas cómo funciona el sistema.
            </p>
            <form action={async () => {
              await simulateBookingAction();
            }}>
              <button
                type="submit"
                className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-[var(--radius-squircle-lg)] transition-all shadow-lg shadow-brand-500/20 active:scale-95"
              >
                Simular Reserva de Prueba
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}