'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Send, Loader2, Check, Lightbulb, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { submitAmenitySuggestion } from '@/app/actions/community-templates';

interface SuggestAmenityProps {
  hotelName?: string;
  onSuggested?: () => void;
}

// Icon suggestions mapped to Lucide names
const ICON_SUGGESTIONS = [
  { name: 'Wifi', label: 'Wi-Fi' },
  { name: 'Car', label: 'Parqueadero' },
  { name: 'Waves', label: 'Piscina' },
  { name: 'Coffee', label: 'Café' },
  { name: 'Snowflake', label: 'A/C' },
  { name: 'Tv', label: 'TV' },
  { name: 'Dumbbell', label: 'Gym' },
  { name: 'Utensils', label: 'Restaurante' },
  { name: 'Wine', label: 'Bar' },
  { name: 'Bath', label: 'Spa' },
  { name: 'Mountain', label: 'Vista' },
  { name: 'Palmtree', label: 'Playa' },
  { name: 'Shield', label: 'Seguridad' },
  { name: 'Flame', label: 'Chimenea' },
  { name: 'Sun', label: 'Panorámico' },
  { name: 'Droplets', label: 'Ducha' },
  { name: 'BedDouble', label: 'Cama' },
  { name: 'Wind', label: 'Ventilador' },
  { name: 'Key', label: 'Check-in' },
  { name: 'Luggage', label: 'Equipaje' },
];

export default function SuggestAmenity({ hotelName, onSuggested }: SuggestAmenityProps) {
  const t = useTranslations('onboarding.suggestAmenity');
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'hotel' | 'room' | 'both'>('both');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || name.trim().length < 2) return;

    setIsSubmitting(true);
    const result = await submitAmenitySuggestion({
      name: name.trim(),
      description: description.trim() || undefined,
      locale,
      category,
      suggestedIcon: selectedIcon || undefined,
      hotelName,
    });
    setIsSubmitting(false);

    if (result.success) {
      setSubmitted(true);
      setName('');
      setDescription('');
      setSelectedIcon(null);
      onSuggested?.();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSubmitted(false);
    setName('');
    setDescription('');
    setSelectedIcon(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-amber-400/70 hover:text-amber-300 transition-colors"
      >
        <Lightbulb size={12} />
        {t('suggestLabel')}
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-3 border border-amber-500/10 rounded-[var(--radius-squircle-lg)] bg-black/40 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-amber-500/5">
          <div className="flex items-center gap-2">
            <Lightbulb size={14} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-400/80 uppercase tracking-wider">
              {submitted ? t('suggestionSent') : t('suggestNewAmenity')}
            </span>
          </div>
          <button onClick={handleClose} className="text-zinc-600 hover:text-zinc-400 text-xs">
            <X size={14} />
          </button>
        </div>

        {submitted ? (
          <div className="p-4 text-center space-y-2">
            <Check className="mx-auto text-emerald-400" size={24} />
            <p className="text-xs text-zinc-400">
              {t('successMessage')}
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {/* Name */}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('amenityNamePlaceholder')}
              className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-md)] p-2 text-sm text-white outline-none focus:border-amber-500/50 placeholder:text-zinc-700"
              maxLength={50}
            />

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              className="w-full bg-black/50 border border-white/5 rounded-[var(--radius-squircle-md)] p-2 text-xs text-zinc-300 outline-none focus:border-amber-500/50 resize-none h-16 placeholder:text-zinc-700"
            />

            {/* Category */}
            <div className="flex gap-2">
              {(['hotel', 'room', 'both'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex-1 text-[10px] px-2 py-1.5 rounded-[var(--radius-squircle-md)] border transition-all font-bold uppercase tracking-wider ${
                    category === cat
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-white/5 border-white/5 text-zinc-600 hover:bg-white/10'
                  }`}
                >
                  {cat === 'hotel' ? t('categoryHotel') : cat === 'room' ? t('categoryRoom') : t('categoryBoth')}
                </button>
              ))}
            </div>

            {/* Icon picker */}
            <div>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                {t('iconLabel')}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {ICON_SUGGESTIONS.map(icon => (
                  <button
                    key={icon.name}
                    onClick={() => setSelectedIcon(selectedIcon === icon.name ? null : icon.name)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-all ${
                      selectedIcon === icon.name
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
                    }`}
                  >
                    {icon.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || name.trim().length < 2}
              className="w-full flex items-center justify-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 py-2 rounded-[var(--radius-squircle-md)] text-xs font-bold uppercase tracking-wider hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Send size={12} />
                  {t('submitSuggestion')}
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
