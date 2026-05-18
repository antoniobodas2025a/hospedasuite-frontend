'use client';

import { motion } from 'framer-motion';
import { Building2, Tent, Home, Hotel, Warehouse } from 'lucide-react';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { PropertyType } from '@/lib/room-templates';

const typeIcons: Record<PropertyType, typeof Building2> = {
  hotel: Hotel,
  glamping: Tent,
  cabanas: Home,
  hostal: Warehouse,
  apartamento: Building2,
};

const typeDescriptions: Record<PropertyType, string> = {
  hotel: 'Establecimiento tradicional con habitaciones y servicios completos',
  glamping: 'Experiencia de lujo en la naturaleza',
  cabanas: 'Alojamiento independiente rodeado de naturaleza',
  hostal: 'Alojamiento económico con ambiente social',
  apartamento: 'Espacio completo con cocina y amenities de hogar',
};

export default function PropertyTypeStep() {
  const { hotelIdentity, updateHotelIdentity } = useOnboardingStore();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-xl mx-auto">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-white">Tipo de Propiedad</h3>
        <p className="text-zinc-500 text-sm">Esto determina las plantillas de habitaciones disponibles</p>
      </div>

      <div className="grid gap-3">
        {(['hotel', 'glamping', 'cabanas', 'hostal', 'apartamento'] as const).map(type => {
          const Icon = typeIcons[type];
          const isSelected = hotelIdentity.propertyType === type;
          return (
            <button
              key={type}
              onClick={() => updateHotelIdentity({ propertyType: type })}
              className={`flex items-center gap-4 p-5 rounded-[var(--radius-squircle-xl)] border transition-all text-left ${
                isSelected
                  ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/20'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <div className={`p-3 rounded-[var(--radius-squircle-lg)] ${isSelected ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
                <Icon size={24} className={isSelected ? 'text-indigo-400' : 'text-zinc-500'} />
              </div>
              <div>
                <p className={`font-bold text-sm uppercase tracking-wider ${isSelected ? 'text-indigo-300' : 'text-zinc-300'}`}>{type}</p>
                <p className="text-xs text-zinc-500 mt-1">{typeDescriptions[type]}</p>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
