import Link from 'next/link';
import { CheckCircle2, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { verifyBookingAction } from '@/app/actions/bookings';

export const dynamic = 'force-dynamic';

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; id_wompi?: string; transactionId?: string }>;
}) {
  const { id, id_wompi, transactionId } = await searchParams;
  const bookingId = id || transactionId;

  // Si no hay ID, mostrar error
  if (!bookingId) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card max-w-lg w-full rounded-[var(--radius-squircle-3xl)] shadow-xl p-8 text-center border border-border">
          <div className="w-24 h-24 bg-muted/50 text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={48} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-4">
            Reserva No Encontrada
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            No pudimos verificar tu reserva. Si realizaste un pago, contacta al hotel directamente.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-foreground text-background font-bold py-4 px-8 rounded-[var(--radius-squircle-lg)] hover:bg-brand-800 transition-colors"
          >
            Volver al Inicio <ArrowRight size={20} />
          </Link>
        </div>
      </main>
    );
  }

  // Verificar booking real en la base de datos
  const result = await verifyBookingAction(bookingId);

  if (!result.success || !result.booking) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card max-w-lg w-full rounded-[var(--radius-squircle-3xl)] shadow-xl p-8 text-center border border-border">
          <div className="w-24 h-24 bg-urgent/10 text-urgent rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={48} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-4">
            Reserva No Encontrada
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            No existe una reserva con el identificador proporcionado. Si realizaste un pago, contacta al hotel.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-foreground text-background font-bold py-4 px-8 rounded-[var(--radius-squircle-lg)] hover:bg-brand-800 transition-colors"
          >
            Volver al Inicio <ArrowRight size={20} />
          </Link>
        </div>
      </main>
    );
  }

  const { booking } = result;

  // Booking confirmed — show success
  if (booking.status === 'CONFIRMED' || booking.status === 'confirmed') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card max-w-lg w-full rounded-[var(--radius-squircle-3xl)] shadow-xl p-8 text-center border border-border">
          <div className="w-24 h-24 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} strokeWidth={2.5} />
          </div>

          <h1 className="text-3xl font-display font-bold text-foreground mb-4">
            ¡Reserva Confirmada!
          </h1>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            Tu pago ha sido procesado correctamente. Hemos asegurado tu reserva y en breve recibirás los detalles en tu correo electrónico.
          </p>

          <div className="bg-muted/50 rounded-[var(--radius-squircle-2xl)] p-6 mb-8 border border-border text-left space-y-4">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Localizador de Reserva</p>
              <p className="font-mono text-sm text-foreground font-bold bg-card px-3 py-2 rounded-[var(--radius-squircle-md)] border border-border">
                {booking.id}
              </p>
            </div>
            {booking.hotelName && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Hotel</p>
                <p className="text-sm text-foreground/80 font-medium">{booking.hotelName}</p>
              </div>
            )}
            {booking.roomName && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Habitación</p>
                <p className="text-sm text-foreground/80 font-medium">{booking.roomName}</p>
              </div>
            )}
            {booking.checkIn && booking.checkOut && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Check-in</p>
                  <p className="text-sm text-foreground/80 font-medium">{new Date(booking.checkIn).toLocaleDateString('es-CO')}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Check-out</p>
                  <p className="text-sm text-foreground/80 font-medium">{new Date(booking.checkOut).toLocaleDateString('es-CO')}</p>
                </div>
              </div>
            )}
            {booking.totalPrice && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Pagado</p>
                <p className="text-lg font-mono font-bold text-secondary">${booking.totalPrice.toLocaleString('es-CO')}</p>
              </div>
            )}
            {id_wompi && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Referencia Wompi</p>
                <p className="text-sm text-foreground/80 font-medium">{id_wompi}</p>
              </div>
            )}
          </div>

          <Link
            href={booking.hotelSlug ? `/ota/${booking.hotelSlug}` : '/'}
            className="inline-flex items-center gap-2 bg-foreground text-background font-bold py-4 px-8 rounded-[var(--radius-squircle-lg)] hover:bg-brand-800 transition-colors"
          >
            Volver al Inicio <ArrowRight size={20} />
          </Link>
        </div>
      </main>
    );
  }

  // Booking pending — payment still processing
  if (booking.status === 'PENDING' || booking.status === 'pending') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card max-w-lg w-full rounded-[var(--radius-squircle-3xl)] shadow-xl p-8 text-center border border-border">
          <div className="w-24 h-24 bg-warning/10 text-warning rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Clock size={48} strokeWidth={2.5} />
          </div>

          <h1 className="text-3xl font-display font-bold text-foreground mb-4">
            Procesando Pago
          </h1>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            Tu reserva fue creada pero el pago aún se está procesando. Una vez confirmado, recibirás un email con los detalles.
          </p>

          <div className="bg-muted/50 rounded-[var(--radius-squircle-2xl)] p-6 mb-8 border border-border text-left">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Localizador de Reserva</p>
              <p className="font-mono text-sm text-foreground font-bold bg-card px-3 py-2 rounded-[var(--radius-squircle-md)] border border-border">
                {booking.id}
              </p>
            </div>
            {booking.totalPrice && (
              <div className="mt-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Monto Pendiente</p>
                <p className="text-lg font-mono font-bold text-warning">${booking.totalPrice.toLocaleString('es-CO')}</p>
              </div>
            )}
          </div>

          <Link
            href={booking.hotelSlug ? `/ota/${booking.hotelSlug}` : '/'}
            className="inline-flex items-center gap-2 bg-foreground text-background font-bold py-4 px-8 rounded-[var(--radius-squircle-lg)] hover:bg-brand-800 transition-colors"
          >
            Volver al Inicio <ArrowRight size={20} />
          </Link>
        </div>
      </main>
    );
  }

  // Booking cancelled or other status
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card max-w-lg w-full rounded-[var(--radius-squircle-3xl)] shadow-xl p-8 text-center border border-border">
        <div className="w-24 h-24 bg-muted/50 text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={48} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-4">
          Estado de Reserva: {booking.status}
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Tu reserva tiene un estado inusual. Contacta al hotel para más información.
        </p>
        <Link
          href={booking.hotelSlug ? `/ota/${booking.hotelSlug}` : '/'}
          className="inline-flex items-center gap-2 bg-foreground text-background font-bold py-4 px-8 rounded-[var(--radius-squircle-lg)] hover:bg-brand-800 transition-colors"
        >
          Volver al Inicio <ArrowRight size={20} />
        </Link>
      </div>
    </main>
  );
}
