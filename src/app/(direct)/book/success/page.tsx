import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; id_wompi?: string }>;
}) {
  const { id, id_wompi } = await searchParams;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card max-w-lg w-full rounded-3xl shadow-xl p-8 text-center border border-border">
        <div className="w-24 h-24 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={48} strokeWidth={2.5} />
        </div>

        <h1 className="text-3xl font-display font-bold text-foreground mb-4">
          Transaccion Exitosa
        </h1>

        <p className="text-muted-foreground mb-8 leading-relaxed">
          Tu pago ha sido procesado correctamente. Hemos asegurado tu reserva y en breve recibiras los detalles en tu correo electronico.
        </p>

        <div className="bg-muted/50 rounded-2xl p-6 mb-8 border border-border text-left">
          <div className="mb-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Localizador de Reserva</p>
            <p className="font-mono text-sm text-foreground font-bold bg-card px-3 py-2 rounded-lg border border-border">
              {id || 'Generando...'}
            </p>
          </div>
          {id_wompi && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Referencia Wompi</p>
              <p className="text-sm text-foreground/80 font-medium">{id_wompi}</p>
            </div>
          )}
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-foreground text-background font-bold py-4 px-8 rounded-xl hover:bg-brand-800 transition-colors"
        >
          Volver al Inicio <ArrowRight size={20} />
        </Link>
      </div>
    </main>
  );
}
