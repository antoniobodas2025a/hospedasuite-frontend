import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Totiao — Acceso VIP',
  description: 'Únete a la lista VIP de Totiao. El verdadero crunch está por llegar.',
};

export default function TotiaoPage() {
  return (
    <div className="bg-zinc-950 text-white min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content */}
      <main className="relative z-10 max-w-md w-full text-center space-y-8">
        {/* Logo / Brand Mark */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 mb-4 animate-pulse">
            <span className="text-2xl">🥩</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            El verdadero{' '}
            <span className="text-orange-500">CRUNCH</span> está por llegar... ⏳
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-zinc-400 text-lg leading-relaxed px-2">
          La paila ya casi está lista. Únete a la lista VIP para saber la fecha exacta y
          llevarte un regalo el día de la apertura.
        </p>

        {/* CTA Button */}
        <div className="pt-4">
          <a
            href="https://wa.me/?text=Hola%20Totiao,%20vengo%20de%20Instagram%20y%20quiero%20estar%20en%20la%20lista%20VIP%20secreta%20de%20apertura.%20%F0%9F%A5%A9%F0%9F%94%A5"
            target="_blank"
            rel="noopener noreferrer"
            className="group block w-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg py-5 px-8 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(234,88,12,0.3)]"
          >
            <span className="flex items-center justify-center gap-2">
              Quiero mi Acceso VIP
              <span className="text-xl transition-transform group-hover:rotate-12">🤫</span>
            </span>
          </a>
          <p className="text-zinc-600 text-xs mt-4">Sin spam. Solo lo importante.</p>
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="absolute bottom-6 text-zinc-700 text-[10px] font-medium tracking-wide">
        TOTAIO — 2026
      </footer>
    </div>
  );
}
