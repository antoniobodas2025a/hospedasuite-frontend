'use client';

import { UploadCloud } from 'lucide-react';
import { useOnboardingStore, RoomDraft } from '@/store/useOnboardingStore';
import { ROOM_AMENITY_REGISTRY } from '@/lib/amenity-registry';

interface RoomDetailStepProps {
  room: RoomDraft;
  onUpdate: (data: Partial<RoomDraft>) => void;
}

export default function RoomDetailStep({ room, onUpdate }: RoomDetailStepProps) {
  const { setRoomImages } = useOnboardingStore();

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const previews = files.map(f => URL.createObjectURL(f));
    setRoomImages(room.id, files, previews);
  };

  const toggleAmenity = (amenityId: string) => {
    const has = room.amenities.includes(amenityId);
    onUpdate({ amenities: has ? room.amenities.filter(a => a !== amenityId) : [...room.amenities, amenityId] });
  };

  return (
    <div className="p-6 border-t border-white/5 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <input
            type="text"
            value={room.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Nombre de la unidad"
            className="w-full bg-transparent border-b border-white/10 text-white outline-none focus:border-indigo-400 font-bold text-lg placeholder:text-zinc-700 pb-2"
          />
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-mono text-sm">$</span>
            <input
              type="number"
              value={room.price || ''}
              onChange={(e) => onUpdate({ price: Number(e.target.value) })}
              placeholder="Precio"
              className="w-28 bg-transparent outline-none text-lg font-bold text-emerald-400 placeholder:text-emerald-700/50"
            />
            <span className="text-xs text-emerald-600">COP/noche</span>
          </div>
          <textarea
            value={room.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Descripción..."
            className="w-full bg-black/40 border border-white/5 rounded-[var(--radius-squircle-lg)] p-3 text-sm text-zinc-300 outline-none focus:border-indigo-500/50 resize-none h-20 placeholder:text-zinc-700"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Capacidad</label>
              <input type="number" value={room.capacity || ''} onChange={(e) => onUpdate({ capacity: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-md)] p-2 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Camas</label>
              <input type="number" value={room.beds || ''} onChange={(e) => onUpdate({ beds: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-md)] p-2 text-white text-sm outline-none" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Images */}
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Fotos ({room.imagePreviews.length}/5)</p>
            {room.imagePreviews.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {room.imagePreviews.map((src, i) => (
                  <img key={i} src={src} alt="" className="h-16 w-24 object-cover rounded-[var(--radius-squircle-md)] border border-white/10 shrink-0" />
                ))}
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-24 border border-dashed border-white/10 rounded-[var(--radius-squircle-lg)] hover:border-indigo-500/40 cursor-pointer">
                <UploadCloud className="text-zinc-600" size={20} />
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImages} />
              </label>
            )}
          </div>

          {/* Amenities */}
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Comodidades</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(ROOM_AMENITY_REGISTRY).map(amenity => {
                const isActive = room.amenities.includes(amenity.id);
                const Icon = amenity.icon;
                return (
                  <button key={amenity.id} onClick={() => toggleAmenity(amenity.id)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-squircle-md)] text-[10px] font-medium transition-all border ${isActive ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'}`}>
                    <Icon size={12} /> {amenity.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
