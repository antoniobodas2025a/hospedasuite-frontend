import React from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="h-[calc(100vh-8rem)] w-full flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
      <div className="relative">
        {/* Orbe de carga con los colores de HospedaSuite */}
        <div className="w-16 h-16 border-4 border-slate-100 border-t-hospeda-500 rounded-full animate-spin shadow-lg"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-hospeda-400 animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-700">Cargando tu Suite...</h3>
        <p className="text-sm text-slate-400">Desencriptando datos del servidor</p>
      </div>
    </div>
  );
}