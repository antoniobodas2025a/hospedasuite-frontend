'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function PropertyGalleryStep() {
  const t = useTranslations('onboarding.gallery');
  const { galleryPreviews, setGalleryImages, removeGalleryImage, validationErrors } = useOnboardingStore();
  const [isDragging, setIsDragging] = useState(false);
  const hasErrors = validationErrors['step-2'];

  const processFiles = (files: File[]) => {
    if (files.length === 0) return;
    const previews = files.map(f => URL.createObjectURL(f));
    setGalleryImages(files, previews);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    processFiles(files);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24, mass: 1.0 }}
      className="space-y-8 max-w-xl mx-auto"
    >
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-white">{t('title')}</h3>
        <p className="text-zinc-500 text-sm">{t('subtitle')}</p>
      </div>

      {/* Validation errors */}
      {hasErrors && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-[var(--radius-squircle-xl)] p-4">
          <p className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">⚠️ {hasErrors}</p>
        </div>
      )}

      {galleryPreviews.length > 0 ? (
        <div
          className="grid grid-cols-3 gap-3"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {galleryPreviews.map((src, i) => (
            <div key={i} className="relative group aspect-square">
              <img src={src} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover rounded-[var(--radius-squircle-lg)] border border-white/10" />
              <motion.button
                onClick={() => removeGalleryImage(i)}
                whileTap={{ scale: 0.8 }}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </motion.button>
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
        <label
          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-[var(--radius-squircle-3xl)] cursor-pointer transition-all group ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
              : 'border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5'
          }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <UploadCloud className={`mb-3 transition-colors ${isDragging ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-indigo-400'}`} size={32} />
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
