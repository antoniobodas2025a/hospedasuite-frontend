'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function HotelDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Hotel detail page error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <AlertTriangle size={48} className="text-warning mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Algo salio mal</h2>
        <p className="text-muted-foreground mb-6">
          No pudimos cargar la pagina del hotel. Intenta de nuevo.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius-squircle-lg)] font-bold hover:bg-primary/90 transition-colors"
        >
          <RefreshCw size={16} /> Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
