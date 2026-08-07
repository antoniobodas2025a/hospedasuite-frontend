'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, BedDouble, Bath, ChevronDown, ShowerHead, Mountain, Eye, EyeOff, Plus, X, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboardingStore, RoomDraft } from '@/store/useOnboardingStore';
import { useHotelImagesStore } from '@/store/useHotelImagesStore';
import { ROOM_AMENITY_REGISTRY, BATHROOM_AMENITY_REGISTRY, VIEW_AMENITY_REGISTRY } from '@/lib/amenity-registry';
import { generateBlurDataURL } from '@/lib/blur-generator';
import AIPolicyAssistant from './AIPolicyAssistant';
import GalleryPicker from './GalleryPicker';
import PriceCalculator from '@/components/dashboard/PriceCalculator';

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

function OptionPicker({ options, value, onChange, label, disabled }: { options: OptionDef[]; value?: string; onChange: (v: string) => void; label: string; disabled?: boolean }) {
  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
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
              disabled={disabled}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-squircle-md)] text-[11px] font-medium transition-all border ${
                isActive
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
              } disabled:cursor-not-allowed`}
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
  const { setRoomImages, removeRoomImage } = useOnboardingStore();
  const { categorizedImages } = useHotelImagesStore();
  const isTemplate = !!room.fromTemplate;
  const [isDragging, setIsDragging] = useState(false);
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<RoomSectionId, boolean>>({
    essentials: true,
    bathroom: false,
    details: false,
  });

  const toggleSection = (id: RoomSectionId) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const remaining = 5 - room.imagePreviews.length;
    if (remaining <= 0) return;

    // Deduplicate: skip files that already exist (same name + size)
    const existingKeys = new Set(
      room.imageFiles.map(f => `${f.name}-${f.size}`)
    );
    const unique = files.filter(f => !existingKeys.has(`${f.name}-${f.size}`));

    const toAdd = unique.slice(0, remaining);
    if (toAdd.length === 0) return;

    const previews = toAdd.map(f => URL.createObjectURL(f));
    
    // Generate blur data for each image
    const blurDataPromises = toAdd.map(async (file) => {
      try {
        return await generateBlurDataURL(file);
      } catch (error) {
        console.warn('Failed to generate blur data:', error);
        return '';
      }
    });
    const blurData = await Promise.all(blurDataPromises);
    
    setRoomImages(room.id, [...room.imageFiles, ...toAdd], [...room.imagePreviews, ...previews], [...room.imageBlurData, ...blurData]);
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

  const handleCopyFromGallery = async (files: File[], previews: string[]) => {
    if (files.length === 0) return;
    const remaining = 5 - room.imagePreviews.length;
    if (remaining <= 0) return;

    const toAdd = files.slice(0, remaining);
    const toAddPreviews = previews.slice(0, remaining);

    // Generate blur data for copied images
    const blurDataPromises = toAdd.map(async (file) => {
      try {
        return await generateBlurDataURL(file);
      } catch (error) {
        console.warn('Failed to generate blur data:', error);
        return '';
      }
    });
    const blurData = await Promise.all(blurDataPromises);

    setRoomImages(room.id, [...room.imageFiles, ...toAdd], [...room.imagePreviews, ...toAddPreviews], [...room.imageBlurData, ...blurData]);
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

        {/* Price Calculator - shows when price > 0 */}
        {room.price > 0 && (
          <div className="mt-4">
            <PriceCalculator
              basePrice={room.price}
              taxRegime="simplified"
              compact
            />
          </div>
        )}

        {/* Capacity + Beds inline — locked for template rooms */}
        <div className={`grid grid-cols-2 gap-3 ${isTemplate ? 'opacity-50' : ''}`}>
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('capacityLabel')}</label>
            <input
              type="number"
              value={room.capacity || ''}
              onChange={(e) => onUpdate({ capacity: Number(e.target.value) })}
              disabled={false}
              className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-md)] p-2 text-white text-sm outline-none focus:border-indigo-500/50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('bedsLabel')}</label>
            <input
              type="number"
              value={room.beds || ''}
              onChange={(e) => onUpdate({ beds: Number(e.target.value) })}
              disabled={false}
              className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-md)] p-2 text-white text-sm outline-none focus:border-indigo-500/50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Bed type — locked for template rooms */}
        <OptionPicker
          options={bedTypes}
          value={room.bedType}
          onChange={(v) => onUpdate({ bedType: v as RoomDraft['bedType'] })}
          label={t('bedTypeLabel')}
          disabled={false}
        />
      </div>

      {/* ── Chunk 2: Baño, vistas y espacio (colapsable, unificado) ─ */}
      <RoomSection
        icon={Bath}
        title={isTemplate ? 'Personalizar habitación (opcional)' : t('bathroomSectionTitle')}
        isOpen={openSections.bathroom}
        onToggle={() => toggleSection('bathroom')}
      >
        <OptionPicker
          options={bathroomTypes}
          value={room.bathroomType}
          onChange={(v) => onUpdate({ bathroomType: v as RoomDraft['bathroomType'] })}
          label={t('bathroomLabel')}
          disabled={false}
        />

        <OptionPicker
          options={showerTypes}
          value={room.showerType}
          onChange={(v) => onUpdate({ showerType: v as RoomDraft['showerType'] })}
          label={t('showerLabel')}
          disabled={false}
        />

        {/* Hot water toggle — defaults to true */}
        <div className={`flex items-center justify-between ${isTemplate ? 'opacity-50' : ''}`}>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('hotWaterSectionTitle')}</p>
          <motion.button
            onClick={() => onUpdate({ hotWater: !room.hotWater })}
            whileTap={{ scale: 0.9 }}
            disabled={false}
            className={`relative w-10 h-5 rounded-full transition-colors ${room.hotWater ? 'bg-indigo-500/50' : 'bg-zinc-700'} disabled:cursor-not-allowed`}
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
          disabled={false}
        />

        {/* Bathroom amenities — detalles adicionales (Jacuzzi, etc.) */}
        <div className={`pt-2 border-t border-white/5 ${isTemplate ? 'opacity-50' : ''}`}>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Detalles de baño</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(BATHROOM_AMENITY_REGISTRY).map(amenity => {
              const isActive = room.amenities.includes(amenity.id);
              const Icon = amenity.icon;
              return (
                <motion.button
                  key={amenity.id}
                  onClick={() => toggleAmenity(amenity.id)}
                  whileTap={{ scale: 0.93 }}
                  disabled={false}
                  className={`flex items-center gap-1 px-2 py-1 rounded-[var(--radius-squircle-md)] text-[10px] font-medium transition-all border ${
                    isActive
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
                  } disabled:cursor-not-allowed`}
                >
                  <Icon size={10} /> {amenity.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* View amenities — detalles adicionales (Balcón, etc.) */}
        <div className={`pt-2 border-t border-white/5 ${isTemplate ? 'opacity-50' : ''}`}>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Detalles de vista</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(VIEW_AMENITY_REGISTRY).map(amenity => {
              const isActive = room.amenities.includes(amenity.id);
              const Icon = amenity.icon;
              return (
                <motion.button
                  key={amenity.id}
                  onClick={() => toggleAmenity(amenity.id)}
                  whileTap={{ scale: 0.93 }}
                  disabled={false}
                  className={`flex items-center gap-1 px-2 py-1 rounded-[var(--radius-squircle-md)] text-[10px] font-medium transition-all border ${
                    isActive
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
                  } disabled:cursor-not-allowed`}
                >
                  <Icon size={10} /> {amenity.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </RoomSection>

      {/* ── Chunk 3: Detalles (colapsable) ── */}
      <RoomSection
        icon={BedDouble}
        title={t('photosAmenitiesTitle')}
        isOpen={openSections.details}
        onToggle={() => toggleSection('details')}
        badge={room.amenities.length > 0 ? `${room.amenities.length}` : undefined}
      >
        {/* Description + AI — locked for template rooms */}
        <div className={`space-y-1 ${isTemplate ? 'opacity-50 pointer-events-none' : ''}`}>
          <textarea
            value={room.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder={t('descriptionPlaceholder')}
            disabled={false}
            className="w-full bg-black/40 border border-white/5 rounded-[var(--radius-squircle-lg)] p-3 text-sm text-zinc-300 outline-none focus:border-indigo-500/50 resize-none h-20 placeholder:text-zinc-700 disabled:cursor-not-allowed"
          />
          <AIPolicyAssistant
            type="roomDescription"
            context={{ roomType: room.type, roomCapacity: room.capacity }}
            onAccept={(text) => onUpdate({ description: text })}
          />
        </div>

        {/* Photos — se configuran desde el dashboard */}
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-[var(--radius-squircle-lg)] text-xs text-indigo-300 text-center">
          📸 Las fotos de la habitación se agregan desde el <strong>Dashboard → Inventario</strong> después de activar tu propiedad.
        </div>

        {/* Amenities — Comodidades generales */}
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
                  disabled={false}
                  className={`flex items-center gap-1 px-2 py-1 rounded-[var(--radius-squircle-md)] text-[10px] font-medium transition-all border ${
                    isActive
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
                  } disabled:cursor-not-allowed`}
                >
                  <Icon size={10} /> {amenity.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </RoomSection>

      {/* Gallery Picker Modal */}
      <GalleryPicker
        isOpen={isGalleryPickerOpen}
        onClose={() => setIsGalleryPickerOpen(false)}
        onCopy={handleCopyFromGallery}
        existingFiles={room.imageFiles}
        maxImages={5 - room.imagePreviews.length}
      />
    </div>
  );
}
