'use client';

import { motion } from 'framer-motion';
import { UploadCloud, Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { hotelIdentitySchema } from '@/lib/onboarding-schemas';

export default function HotelIdentityStep() {
  const t = useTranslations('onboarding.identity');
  const { hotelIdentity, updateHotelIdentity, logoPreview, setLogo, setCoverPhoto, validationErrors } = useOnboardingStore();

  const handleFileChange = (type: 'logo' | 'cover', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      if (type === 'logo') setLogo(file, preview);
      else setCoverPhoto(file, preview);
    }
  };

  const isValid = hotelIdentitySchema.safeParse(hotelIdentity).success;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 max-w-xl mx-auto">
      <div className="text-center space-y-2">
        <Building2 className="mx-auto text-indigo-400" size={32} />
        <h3 className="text-2xl font-bold text-white">{t('title')}</h3>
        <p className="text-zinc-500 text-sm">{t('subtitle')}</p>
      </div>

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

        {/* Property Type */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('propertyTypeLabel')} *</label>
          <div className="flex flex-wrap gap-2">
            {(['hotel', 'glamping', 'cabanas', 'hostal', 'apartamento'] as const).map(type => (
              <button
                key={type}
                onClick={() => updateHotelIdentity({ propertyType: type })}
                className={`px-4 py-2 rounded-[var(--radius-squircle-lg)] text-xs font-bold uppercase tracking-wider transition-all border ${
                  hotelIdentity.propertyType === type
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('logoLabel')}</label>
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/10 rounded-[var(--radius-squircle-3xl)] hover:border-indigo-500/40 hover:bg-indigo-500/5 cursor-pointer transition-all group">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="max-h-full p-4 object-contain" />
            ) : (
              <div className="text-center space-y-3">
                <UploadCloud className="mx-auto text-zinc-500 group-hover:text-indigo-400 transition-colors" size={28} />
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
