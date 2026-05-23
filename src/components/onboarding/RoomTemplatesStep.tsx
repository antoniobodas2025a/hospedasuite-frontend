'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { getTemplatesForProperty, PropertyType } from '@/lib/room-templates';
import RoomDetailStep from './RoomDetailStep';

const springs = {
  fast: { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 },
  medium: { type: 'spring' as const, stiffness: 300, damping: 24, mass: 1.0 },
};

export default function RoomTemplatesStep() {
  const t = useTranslations('onboarding.roomTemplates');
  const { hotelIdentity, rooms, addRoomFromTemplate, addEmptyRoom, removeRoom, updateRoom, validationErrors } = useOnboardingStore();
  const propertyType = hotelIdentity.propertyType as PropertyType;
  const templates = getTemplatesForProperty(propertyType);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const hasErrors = validationErrors['step-4'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.medium}
      className="space-y-8"
    >
      {/* Header — 1 decisión */}
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-xl font-bold text-white uppercase tracking-widest">{t('title')}</h3>
          <p className="text-zinc-500 text-sm mt-1">{t('subtitle')}</p>
        </div>
        <motion.button
          onClick={addEmptyRoom}
          whileTap={{ scale: 0.95 }}
          className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 uppercase"
        >
          <Plus size={14} /> {t('empty')}
        </motion.button>
      </div>

      {/* Validation errors */}
      {hasErrors && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-[var(--radius-squircle-xl)] p-4 space-y-1">
          <p className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">⚠️ Habitaciones</p>
          {hasErrors.split(', ').map((err, i) => (
            <p key={i} className="text-rose-300 text-sm">• {err}</p>
          ))}
        </div>
      )}

      {/* Template Selector — grid de opciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map(template => (
          <motion.button
            key={template.id}
            onClick={() => addRoomFromTemplate(propertyType, template.id)}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            transition={springs.fast}
            className="p-4 bg-white/5 border border-white/5 rounded-[var(--radius-squircle-xl)] hover:bg-white/10 hover:border-indigo-500/30 transition-all text-left"
          >
            <p className="font-bold text-sm text-white">{template.name}</p>
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{template.description}</p>
            <div className="flex gap-3 mt-3 text-[10px] text-zinc-600">
              <span>👤 {template.defaultCapacity}</span>
              <span>🛏️ {template.defaultBeds}</span>
              <span>💰 ${template.priceRange[0].toLocaleString()}</span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Room List — progressive disclosure */}
      <AnimatePresence>
        {rooms.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={springs.medium}
            className="space-y-4"
          >
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {t('configured', { count: rooms.length, plural: rooms.length > 1 ? 'es' : '' })}
            </p>
            {rooms.map(room => (
              <motion.div
                key={room.id}
                layout
                className="bg-zinc-900/30 border border-white/5 rounded-[var(--radius-squircle-xl)] overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedRoomId(expandedRoomId === room.id ? null : room.id)}
                >
                  <div>
                    <p className="font-bold text-white text-sm">{room.name || t('noName')}</p>
                    <p className="text-xs text-zinc-500">${room.price.toLocaleString()} {t('perNight')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); removeRoom(room.id); }}
                      whileTap={{ scale: 0.8 }}
                      disabled={rooms.length === 1}
                      className="text-zinc-600 hover:text-rose-500 transition-colors disabled:opacity-0"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                    <motion.div
                      animate={{ rotate: expandedRoomId === room.id ? 180 : 0 }}
                      transition={springs.medium}
                    >
                      <ChevronDown size={18} className="text-zinc-500" />
                    </motion.div>
                  </div>
                </div>
                <AnimatePresence>
                  {expandedRoomId === room.id && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={springs.medium}
                    >
                      <RoomDetailStep room={room} onUpdate={(data) => updateRoom(room.id, data)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
