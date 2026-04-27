'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Wind,
  Clock,
  Hammer
} from 'lucide-react';
import { updateRoomStatusAction, RoomStatus } from '@/app/actions/rooms';
import { cn } from '@/lib/utils';

interface Room {
  id: string;
  name: string;
  status: string;
  type?: string;
}

export default function HousekeepingPanel({ rooms }: { rooms: Room[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusChange = async (roomId: string, status: RoomStatus) => {
    setLoadingId(roomId);
    const res = await updateRoomStatusAction(roomId, status);
    if (!res.success) alert('Fallo en Transición: ' + res.error);
    setLoadingId(null);
  };

  const dirtyRooms = rooms.filter(r => r.status === 'dirty');
  const availableRooms = rooms.filter(r => r.status === 'available');
  const otherRooms = rooms.filter(r => r.status !== 'dirty' && r.status !== 'available');

  return (
    <div className="space-y-10 pb-20">
      
      {/* 1. SECCIÓN CRÍTICA: PRIORIDAD DE ASEO */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-400 flex items-center gap-2">
            <AlertCircle size={14} /> Requerimiento Inmediato ({dirtyRooms.length})
          </h3>
        </div>
        
        {dirtyRooms.length === 0 ? (
          <div className="p-12 border border-dashed border-white/5 rounded-[2.5rem] text-center bg-zinc-900/20 backdrop-blur-md">
            <CheckCircle2 className="mx-auto size-8 text-emerald-500/30 mb-3" />
            <p className="text-zinc-500 font-medium italic text-sm">Planta física en estado óptimo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {dirtyRooms.map(room => (
              <div key={room.id} className="group relative overflow-hidden p-6 bg-zinc-900/40 border border-rose-500/20 rounded-[2.5rem] flex justify-between items-center transition-all hover:bg-zinc-900/60 shadow-2xl shadow-rose-500/5">
                <div>
                  <h4 className="text-2xl font-bold text-zinc-100 tracking-tighter">{room.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Sucia / Post-Salida</p>
                  </div>
                </div>
                <button
                  disabled={loadingId === room.id}
                  onClick={() => handleStatusChange(room.id, 'available')}
                  className="relative size-14 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-2xl transition-all flex items-center justify-center shadow-xl group-active:scale-90"
                >
                  {loadingId === room.id ? (
                    <RefreshCw className="animate-spin" size={24} />
                  ) : (
                    <Sparkles size={24} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. GRID DE DISPONIBILIDAD (Estado de Planta) */}
      <section className="space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-2">
          Inventario de Unidades ({rooms.length})
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {rooms.map(room => {
            const isDirty = room.status === 'dirty';
            const isAvailable = room.status === 'available';
            const isOccupied = room.status === 'occupied';

            return (
              <div 
                key={room.id} 
                className={cn(
                  "p-4 rounded-[1.5rem] border transition-all flex flex-col gap-4",
                  isDirty ? "bg-rose-500/5 border-rose-500/20" : 
                  isAvailable ? "bg-zinc-900/40 border-white/5" :
                  "bg-indigo-500/5 border-indigo-500/20"
                )}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-zinc-100 tracking-tighter">{room.name}</span>
                  <div className={cn(
                    "size-2 rounded-full",
                    isAvailable ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                    isOccupied ? "bg-indigo-500" : "bg-rose-500"
                  )} />
                </div>

                <select 
                  value={room.status}
                  onChange={(e) => handleStatusChange(room.id, e.target.value as RoomStatus)}
                  className="bg-zinc-950/50 border-none text-[9px] font-black uppercase tracking-[0.1em] text-zinc-400 rounded-xl p-2 outline-none cursor-pointer appearance-none text-center"
                >
                  <option value="available">✓ Disponible</option>
                  <option value="dirty">⚠ Sucia</option>
                  <option value="maintenance">🔧 Taller</option>
                  <option value="occupied">👤 Ocupada</option>
                </select>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}