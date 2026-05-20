'use client';

import { motion } from 'framer-motion';
import { UploadCloud, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function PropertyGalleryStep() {
  const t = useTranslations('onboarding.gallery');
  const { galleryPreviews, setGalleryImages, removeGalleryImage } = useOnboardingStore();

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const previews = files.map(f => URL.createObjectURL(f));
    setGalleryImages(files, previews);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-xl mx-auto">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-white">{t('title')}</h3>
        <p className="text-zinc-500 text-sm">{t('subtitle')}</p>
      </div>

      {galleryPreviews.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {galleryPreviews.map((src, i) => (
            <div key={i} className="relative group aspect-square">
              <img src={src} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover rounded-[var(--radius-squircle-lg)] border border-white/10" />
              <button
                onClick={() => removeGalleryImage(i)}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {galleryPreviews.length < 8 && (
            <label className="flex items-center justify-center border-2 border-dashed border-white/10 rounded-[var(--radius-squircle-lg)] hover:border-indigo-500/40 cursor-pointer transition-colors aspect-square">
              <Plus className="text-zinc-500" size={24} />
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />
            </label>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-[var(--radius-squircle-3xl)] hover:border-indigo-500/40 hover:bg-indigo-500/5 cursor-pointer transition-all group">
          <UploadCloud className="text-zinc-500 group-hover:text-indigo-400 mb-3 transition-colors" size={32} />
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t('uploadPhotos')}</p>
          <p className="text-[10px] text-zinc-600 mt-1">{t('photoRange')}</p>
          <input type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />
        </label>
      )}

      <div className="text-xs text-zinc-600 text-center">
        {galleryPreviews.length >= 3
          ? t('valid', { count: galleryPreviews.length })
          : t('invalid', { current: galleryPreviews.length })}
      </div>
    </motion.div>
  );
}
