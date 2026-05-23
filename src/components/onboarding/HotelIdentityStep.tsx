'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { hotelIdentitySchema } from '@/lib/onboarding-schemas';

export default function HotelIdentityStep() {
  const t = useTranslations('onboarding.identity');
  const { hotelIdentity, updateHotelIdentity, logoPreview, setLogo, setCoverPhoto, validationErrors } = useOnboardingStore();
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const handleFileChange = (type: 'logo' | 'cover', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      if (type === 'logo') setLogo(file, preview);
      else setCoverPhoto(file, preview);
    }
  };

  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleLogoDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLogo(true);
  };

  const handleLogoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLogo(false);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLogo(false);
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
    if (file) {
      const preview = URL.createObjectURL(file);
      setLogo(file, preview);
    }
  };

  const isValid = hotelIdentitySchema.safeParse(hotelIdentity).success;
  const hasErrors = validationErrors.identity || validationErrors['step-1'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24, mass: 1.0 }}
      className="space-y-10 max-w-xl mx-auto"
    >
      <div className="text-center space-y-2">
        <Building2 className="mx-auto text-indigo-400" size={32} />
        <h3 className="text-2xl font-bold text-white">{t('title')}</h3>
        <p className="text-zinc-500 text-sm">{t('subtitle')}</p>
      </div>

      {/* Validation errors */}
      {hasErrors && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-[var(--radius-squircle-xl)] p-4 space-y-1">
          <p className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">⚠️ Campos requeridos</p>
          {hasErrors.split(', ').map((err, i) => (
            <p key={i} className="text-rose-300 text-sm">• {err}</p>
          ))}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('nameLabel')} *</label>
          <input
            type="text"
            value={hotelIdentity.name}
            onChange={(e) => updateHotelIdentity({ name: e.target.value })}
            placeholder={t('namePlaceholder')}
            className={`w-full bg-black/50 border rounded-[var(--radius-squircle-2xl)] p-4 text-white outline-none transition-all text-lg placeholder:text-zinc-700 ${
              validationErrors.identity ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-indigo-500/50'
            }`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('cityLabel')} *</label>
            <input
              type="text"
              value={hotelIdentity.city}
              onChange={(e) => updateHotelIdentity({ city: e.target.value })}
              placeholder={t('cityPlaceholder')}
              className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-2xl)] p-4 text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('locationLabel')} *</label>
            <input
              type="text"
              value={hotelIdentity.location}
              onChange={(e) => updateHotelIdentity({ location: e.target.value })}
              placeholder={t('locationPlaceholder')}
              className="w-full bg-black/50 border border-white/10 rounded-[var(--radius-squircle-2xl)] p-4 text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
            />
          </div>
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('logoLabel')}</label>
          <label
            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-[var(--radius-squircle-3xl)] cursor-pointer transition-all group ${
              isDraggingLogo
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
                : 'border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5'
            }`}
            onDragOver={handleLogoDragOver}
            onDragEnter={handleLogoDragEnter}
            onDragLeave={handleLogoDragLeave}
            onDrop={handleLogoDrop}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="max-h-full p-4 object-contain" />
            ) : (
              <div className="text-center space-y-3">
                <UploadCloud className={`mx-auto transition-colors ${isDraggingLogo ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-indigo-400'}`} size={28} />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t('uploadLogo')}</p>
              </div>
            )}
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange('logo', e)} />
          </label>
        </div>
      </div>

      <div className="text-xs text-zinc-600 text-center">
        {isValid ? `✅ ${t('valid')}` : `⚠️ ${t('invalid')}`}
      </div>
    </motion.div>
  );
}
