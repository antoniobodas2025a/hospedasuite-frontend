'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { getTemplatesForProperty, PropertyType } from '@/lib/room-templates';
import RoomDetailStep from './RoomDetailStep';

export default function RoomTemplatesStep() {
  const { hotelIdentity, rooms, addRoomFromTemplate, addEmptyRoom, removeRoom, updateRoom } = useOnboardingStore();
  const propertyType = hotelIdentity.propertyType as PropertyType;
  const templates = getTemplatesForProperty(propertyType);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-xl font-bold text-white uppercase tracking-widest">Tus Unidades</h3>
          <p className="text-zinc-500 text-sm mt-1">Elegí plantillas o creá habitaciones personalizadas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addEmptyRoom} className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 uppercase">
            <Plus size={14} /> Vacía
          </button>
        </div>
      </div>

      {/* Template Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map(template => (
          <button
            key={template.id}
            onClick={() => addRoomFromTemplate(propertyType, template.id)}
            className="p-4 bg-white/5 border border-white/5 rounded-[var(--radius-squircle-xl)] hover:bg-white/10 hover:border-indigo-500/30 transition-all text-left"
          >
            <p className="font-bold text-sm text-white">{template.name}</p>
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{template.description}</p>
            <div className="flex gap-3 mt-3 text-[10px] text-zinc-600">
              <span>👤 {template.defaultCapacity}</span>
              <span>🛏️ {template.defaultBeds}</span>
              <span>💰 ${template.priceRange[0].toLocaleString()}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Room List */}
      <AnimatePresence>
        {rooms.length > 0 && (
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{rooms.length} unidad{rooms.length > 1 ? 'es' : ''} configurada{rooms.length > 1 ? 's' : ''}</p>
            {rooms.map(room => (
              <motion.div key={room.id} layout className="bg-zinc-900/30 border border-white/5 rounded-[var(--radius-squircle-xl)] overflow-hidden">
                <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedRoomId(expandedRoomId === room.id ? null : room.id)}>
                  <div>
                    <p className="font-bold text-white text-sm">{room.name || 'Sin nombre'}</p>
                    <p className="text-xs text-zinc-500">${room.price.toLocaleString()} / noche</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); removeRoom(room.id); }} disabled={rooms.length === 1} className="text-zinc-600 hover:text-rose-500 transition-colors disabled:opacity-0">
                      <Trash2 size={16} />
                    </button>
                    {expandedRoomId === room.id ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
                  </div>
                </div>
                <AnimatePresence>
                  {expandedRoomId === room.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
                      <RoomDetailStep room={room} onUpdate={(data) => updateRoom(room.id, data)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
