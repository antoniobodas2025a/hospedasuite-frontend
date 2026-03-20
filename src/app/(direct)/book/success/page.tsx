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
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-3xl shadow-xl p-8 text-center border border-slate-100">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={48} strokeWidth={2.5} />
        </div>
        
        <h1 className="text-3xl font-display font-bold text-slate-800 mb-4">
          ¡Transacción Exitosa!
        </h1>
        
        <p className="text-slate-600 mb-8 leading-relaxed">
          Tu pago ha sido procesado correctamente. Hemos asegurado tu reserva y en breve recibirás los detalles en tu correo electrónico.
        </p>

        <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100 text-left">
          <div className="mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Localizador de Reserva</p>
            <p className="font-mono text-sm text-slate-800 font-bold bg-white px-3 py-2 rounded-lg border border-slate-200">
              {id || 'Generando...'}
            </p>
          </div>
          {id_wompi && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Referencia Wompi</p>
              <p className="text-sm text-slate-700 font-medium">{id_wompi}</p>
            </div>
          )}
        </div>

        <Link 
          href="/" 
          className="inline-flex items-center gap-2 bg-hospeda-900 text-white font-bold py-4 px-8 rounded-xl hover:bg-black transition-colors"
        >
          Volver al Inicio <ArrowRight size={20} />
        </Link>
      </div>
    </main>
  );
}