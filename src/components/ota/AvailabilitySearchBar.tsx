'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Search } from 'lucide-react';

// 🚨 FIX QA (TIMEZONE SHIFT): Calculadora de Fecha Local Segura
// Previene que a las 8PM en América, la fecha salte al día siguiente por el desfase UTC.
const getLocalTodayString = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000; // Desfase en milisegundos
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

export default function AvailabilitySearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialCheckIn = searchParams.get('checkin') || '';
  const initialCheckOut = searchParams.get('checkout') || '';

  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [isSearching, setIsSearching] = useState(false);

  // Instanciamos el día de hoy con precisión de zona horaria local
  const todayLocalStr = getLocalTodayString();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut) return alert("Por favor selecciona ambas fechas.");
    if (new Date(checkIn) >= new Date(checkOut)) return alert("La fecha de salida debe ser posterior a la de entrada.");

    setIsSearching(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('checkin', checkIn);
    params.set('checkout', checkOut);
    
    params.delete('showRoom'); 

    router.push(`?${params.toString()}`, { scroll: false });
    setIsSearching(false);
  };

  return (
    <div className="bg-white p-2 rounded-2xl shadow-xl border border-slate-100 max-w-3xl mx-auto -mt-16 relative z-20 flex flex-col md:flex-row gap-2">
      <form onSubmit={handleSearch} className="flex-1 flex flex-col md:flex-row gap-2">
        <div className="flex-1 flex items-center bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 focus-within:ring-2 focus-within:ring-hospeda-500 transition-all">
          <Calendar size={20} className="text-slate-400 mr-3" />
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Llegada</label>
            <input 
              type="date" 
              required
              min={todayLocalStr} // 🚨 FIX: Bloqueo seguro usando fecha local
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-transparent text-slate-800 font-medium outline-none text-sm" 
            />
          </div>
        </div>

        <div className="flex-1 flex items-center bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 focus-within:ring-2 focus-within:ring-hospeda-500 transition-all">
          <Calendar size={20} className="text-slate-400 mr-3" />
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Salida</label>
            <input 
              type="date" 
              required
              min={checkIn || todayLocalStr} // 🚨 FIX: Bloqueo progresivo seguro
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-transparent text-slate-800 font-medium outline-none text-sm" 
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSearching}
          className="bg-hospeda-900 hover:bg-black text-white px-8 py-3 md:py-0 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-105 disabled:opacity-50"
        >
          {isSearching ? <span className="animate-pulse">Buscando...</span> : <><Search size={18} /> Buscar</>}
        </button>
      </form>
    </div>
  );
}