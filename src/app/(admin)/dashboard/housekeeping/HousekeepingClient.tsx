'use client';

import React, { useState } from 'react';
import { Sparkles, Hammer, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { updateRoomStatusAction, RoomStatus } from '@/app/actions/rooms';
import { cn } from '@/lib/utils';

export default function HousekeepingClient({ initialRooms }: { initialRooms: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusChange = async (roomId: string, status: RoomStatus) => {
    setLoadingId(roomId);
    const res = await updateRoomStatusAction(roomId, status);
    if (!res.success) alert('Error: ' + res.error);
    setLoadingId(null);
  };

  const dirtyRooms = initialRooms.filter(r => r.status === 'dirty');
  const otherRooms = initialRooms.filter(r => r.status !== 'dirty');

  return (
    <div className="space-y-10">
      {/* 1. SECCIÓN CRÍTICA: UNIDADES SUCIAS (Prioridad 1) */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-rose-400 flex items-center gap-2">
          <AlertCircle size={14} /> Requerimiento de Limpieza ({dirtyRooms.length})
        </h3>
        
        {dirtyRooms.length === 0 ? (
          <div className="p-12 border border-dashed border-white/5 rounded-[2.5rem] text-center bg-zinc-900/20">
            <CheckCircle2 className="mx-auto size-8 text-emerald-500/30 mb-3" />
            <p className="text-zinc-500 font-medium italic">Todas las unidades se reportan en estado óptimo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {dirtyRooms.map(room => (
              <div key={room.id} className="p-6 bg-zinc-900/40 border border-rose-500/20 rounded-[2rem] flex justify-between items-center group hover:bg-zinc-900/60 transition-all">
                <div>
                  <h4 className="text-xl font-bold text-zinc-100">{room.name}</h4>
                  <p className="text-[10px] font-bold text-rose-400 uppercase mt-1">Estado: Sucia / Post-Checkout</p>
                </div>
                <button
                  disabled={loadingId === room.id}
                  onClick={() => handleStatusChange(room.id, 'available')}
                  className="p-4 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-2xl transition-all flex items-center gap-2 font-bold text-sm shadow-xl"
                >
                  {loadingId === room.id ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  Listo para Check-in
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. INVENTARIO GENERAL */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Estado General de Planta</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {otherRooms.map(room => (
            <div key={room.id} className="p-4 bg-zinc-950 border border-white/5 rounded-2xl flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-zinc-200">{room.name}</span>
                <div className={cn(
                  "size-2 rounded-full",
                  room.status === 'available' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                  room.status === 'occupied' ? "bg-indigo-500" : "bg-amber-500"
                )} />
              </div>
              <select 
                value={room.status}
                onChange={(e) => handleStatusChange(room.id, e.target.value as RoomStatus)}
                className="bg-zinc-900 border-none text-[10px] font-bold uppercase tracking-widest text-zinc-400 rounded-lg p-1 outline-none"
              >
                <option value="available">Disponible</option>
                <option value="occupied">Ocupada</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="dirty">Sucia</option>
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}