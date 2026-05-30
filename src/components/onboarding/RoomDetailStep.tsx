'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, BedDouble, Bath, Maximize2, ChevronDown, ChevronUp, Droplets, ShowerHead, Mountain, Eye, EyeOff, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboardingStore, RoomDraft } from '@/store/useOnboardingStore';
import { ROOM_AMENITY_REGISTRY } from '@/lib/amenity-registry';
import AIPolicyAssistant from './AIPolicyAssistant';

const springs = {
  fast: { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 },
  medium: { type: 'spring' as const, stiffness: 300, damping: 24, mass: 1.0 },
};

interface RoomDetailStepProps {
  room: RoomDraft;
  onUpdate: (data: Partial<RoomDraft>) => void;
}

// ── Option pickers — reutilizables ──

type OptionDef = { value: string; label: string; icon?: React.ElementType };

function OptionPicker({ options, value, onChange, label }: { options: OptionDef[]; value?: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const Icon = opt.icon;
          const isActive = value === opt.value;
          return (
            <motion.button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              whileTap={{ scale: 0.93 }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-squircle-md)] text-[11px] font-medium transition-all border ${
                isActive
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
              }`}
            >
              {Icon && <Icon size={12} />}
              {opt.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ── Collapsible section ──

function RoomSection({ icon: Icon, title, isOpen, onToggle, children, badge }: {
  icon: React.ElementType;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="bg-black/20 border border-white/5 rounded-[var(--radius-squircle-lg)] overflow-hidden">
      <motion.button
        onClick={onToggle}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={14} className="text-zinc-500" />
          <span className="text-xs font-bold text-zinc-300">{title}</span>
          {badge && (
            <span className="bg-indigo-500/20 text-indigo-400 text-[9px] px-1.5 py-0.5 rounded-full font-mono">{badge}</span>
          )}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={springs.medium}>
          <ChevronDown size={14} className="text-zinc-600" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springs.medium}
          >
            <div className="p-3 pt-0 border-t border-white/5 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ──

type RoomSectionId = 'essentials' | 'bathroom' | 'details';

export default function RoomDetailStep({ room, onUpdate }: RoomDetailStepProps) {
  const t = useTranslations('onboarding.roomDetail');
  const { setRoomImages } = useOnboardingStore();
  const [isDragging, setIsDragging] = useState(false);
  const [openSections, setOpenSections] = useState<Record<RoomSectionId, boolean>>({
    essentials: true,
    bathroom: false,
    details: false,
  });

  const toggleSection = (id: RoomSectionId) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const processFiles = (files: File[]) => {
    if (files.length === 0) return;
    const remaining = 5 - room.imagePreviews.length;
    if (remaining <= 0) return;
    const toAdd = files.slice(0, remaining);
    const previews = toAdd.map(f => URL.createObjectURL(f));
    setRoomImages(room.id, [...room.imageFiles, ...toAdd], [...room.imagePreviews, ...previews]);
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    processFiles(files);
  };

  const toggleAmenity = (amenityId: string) => {
    const has = room.amenities.includes(amenityId);
    onUpdate({ amenities: has ? room.amenities.filter(a => a !== amenityId) : [...room.amenities, amenityId] });
  };

  // ── Option definitions ──

  const bedTypes: OptionDef[] = [
    { value: 'individual', label: 'Individual' },
    { value: 'doble', label: 'Doble' },
    { value: 'queen', label: 'Queen' },
    { value: 'king', label: 'King' },
    { value: 'litera', label: 'Litera' },
  ];

  const bathroomTypes: OptionDef[] = [
    { value: 'privado', label: 'Privado', icon: Bath },
    { value: 'compartido', label: 'Compartido' },
    { value: 'en-suite', label: 'En-suite', icon: Bath },
    { value: 'exterior', label: 'Exterior' },
  ];

  const showerTypes: OptionDef[] = [
    { value: 'ducha', label: 'Ducha', icon: ShowerHead },
    { value: 'bañera', label: 'Bañera' },
    { value: 'ambos', label: 'Ambos' },
    { value: 'ninguno', label: 'Ninguno' },
  ];

  const roomViews: OptionDef[] = [
    { value: 'interior', label: 'Interior', icon: EyeOff },
    { value: 'exterior', label: 'Exterior', icon: Eye },
    { value: 'jardin', label: 'Jardín' },
    { value: 'mar', label: 'Mar' },
    { value: 'montana', label: 'Montaña', icon: Mountain },
    { value: 'ciudad', label: 'Ciudad' },
  ];

  return (
    <div className="p-4 border-t border-white/5 space-y-3">
      {/* ── Chunk 1: Lo esencial (siempre visible) ── */}
      <div className="space-y-3">
        {/* Name + Price inline */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={room.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder={t('namePlaceholder')}
              className="w-full bg-transparent border-b border-white/10 text-white outline-none focus:border-indigo-400 font-bold text-base placeholder:text-zinc-700 pb-1.5"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-emerald-400 font-mono text-sm">$</span>
            <input
              type="number"
              value={room.price || ''}
              onChange={(e) => onUpdate({ price: Number(e.target.value) })}
              placeholder={t('priceLabel')}
              className="w-24 bg-transparent outline-none text-base font-bold text-emerald-400 placeholder:text-emerald-700/50"
            />
            <span className="text-[10px] text-emerald-600">{t('currencyLabel')}</span>
          </div>
        </div>

        {/* Capacity + Beds inline */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('capacityLabel')}</label>
            <input
              type="number"
              value={room.capacity || ''}
              onChange={(e) => onUpdate({ capacity: Number(e.target.value) })}
              className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-md)] p-2 text-white text-sm outline-none focus:border-indigo-500/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('bedsLabel')}</label>
            <input
              type="number"
              value={room.beds || ''}
              onChange={(e) => onUpdate({ beds: Number(e.target.value) })}
              className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-md)] p-2 text-white text-sm outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Bed type — siempre visible (34% de influencia) */}
        <OptionPicker
          options={bedTypes}
          value={room.bedType}
          onChange={(v) => onUpdate({ bedType: v as RoomDraft['bedType'] })}
          label={t('bedTypeLabel')}
        />
      </div>

      {/* ── Chunk 2: Baño y espacio (colapsable) ── */}
      <RoomSection
        icon={Bath}
        title={t('bathroomSectionTitle')}
        isOpen={openSections.bathroom}
        onToggle={() => toggleSection('bathroom')}
      >
        <OptionPicker
          options={bathroomTypes}
          value={room.bathroomType}
          onChange={(v) => onUpdate({ bathroomType: v as RoomDraft['bathroomType'] })}
          label={t('bathroomLabel')}
        />

        <OptionPicker
          options={showerTypes}
          value={room.showerType}
          onChange={(v) => onUpdate({ showerType: v as RoomDraft['showerType'] })}
          label={t('showerLabel')}
        />

        {/* Hot water toggle */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('hotWaterSectionTitle')}</p>
          <motion.button
            onClick={() => onUpdate({ hotWater: !room.hotWater })}
            whileTap={{ scale: 0.9 }}
            className={`relative w-10 h-5 rounded-full transition-colors ${room.hotWater ? 'bg-indigo-500/50' : 'bg-zinc-700'}`}
          >
            <motion.div
              animate={{ x: room.hotWater ? 20 : 2 }}
              transition={springs.fast}
              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
            />
          </motion.button>
        </div>

        <OptionPicker
          options={roomViews}
          value={room.roomView}
          onChange={(v) => onUpdate({ roomView: v as RoomDraft['roomView'] })}
          label={t('roomViewLabel')}
        />
      </RoomSection>

      {/* ── Chunk 3: Detalles (colapsable) ── */}
      <RoomSection
        icon={BedDouble}
        title={t('photosAmenitiesTitle')}
        isOpen={openSections.details}
        onToggle={() => toggleSection('details')}
        badge={room.amenities.length > 0 ? `${room.amenities.length}` : undefined}
      >
        {/* Description + AI */}
        <div className="space-y-1">
          <textarea
            value={room.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder={t('descriptionPlaceholder')}
            className="w-full bg-black/40 border border-white/5 rounded-[var(--radius-squircle-lg)] p-3 text-sm text-zinc-300 outline-none focus:border-indigo-500/50 resize-none h-20 placeholder:text-zinc-700"
          />
          <AIPolicyAssistant
            type="roomDescription"
            context={{ roomType: room.type, roomCapacity: room.capacity }}
            onAccept={(text) => onUpdate({ description: text })}
          />
        </div>

        {/* Photos — Drag & Drop */}
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{t('photosLabel')} ({room.imagePreviews.length}/5)</p>
          {room.imagePreviews.length > 0 ? (
            <div
              className="grid grid-cols-5 gap-2"
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {room.imagePreviews.map((src, i) => (
                <div key={i} className="relative group aspect-[4/3]">
                  <img src={src} alt="" className="w-full h-full object-cover rounded-[var(--radius-squircle-md)] border border-white/10" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-[var(--radius-squircle-md)]" />
                </div>
              ))}
              {room.imagePreviews.length < 5 && (
                <label className={`flex flex-col items-center justify-center aspect-[4/3] border-2 border-dashed rounded-[var(--radius-squircle-md)] cursor-pointer transition-all ${
                  isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-indigo-500/40'
                }`}>
                  <Plus size={16} className="text-zinc-500" />
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleImages} />
                </label>
              )}
            </div>
          ) : (
            <label
              className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-[var(--radius-squircle-lg)] cursor-pointer transition-all ${
                isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' : 'border-white/10 hover:border-indigo-500/40'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadCloud className={`mb-1 transition-colors ${isDragging ? 'text-indigo-400' : 'text-zinc-600'}`} size={20} />
              <p className="text-[10px] text-zinc-500 font-medium">{isDragging ? 'Soltá las fotos acá' : 'Arrastrá fotos acá o hacé clic'}</p>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImages} />
            </label>
          )}
        </div>

        {/* Amenities */}
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{t('amenitiesLabel')}</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(ROOM_AMENITY_REGISTRY).map(amenity => {
              const isActive = room.amenities.includes(amenity.id);
              const Icon = amenity.icon;
              return (
                <motion.button
                  key={amenity.id}
                  onClick={() => toggleAmenity(amenity.id)}
                  whileTap={{ scale: 0.93 }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-[var(--radius-squircle-md)] text-[10px] font-medium transition-all border ${
                    isActive
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
                  }`}
                >
                  <Icon size={10} /> {amenity.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </RoomSection>
    </div>
  );
}
