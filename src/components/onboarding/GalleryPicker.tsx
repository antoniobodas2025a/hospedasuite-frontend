'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Image as ImageIcon } from 'lucide-react';
import { useHotelImagesStore } from '@/store/useHotelImagesStore';
import { CATEGORY_DISPLAY_ES } from '@/lib/image-category';
import type { ImageCategory } from '@/types';

interface GalleryPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onCopy: (files: File[], previews: string[]) => void;
  existingFiles: File[];
  maxImages: number;
}

export default function GalleryPicker({
  isOpen,
  onClose,
  onCopy,
  existingFiles,
  maxImages,
}: GalleryPickerProps) {
  const { categorizedImages } = useHotelImagesStore();
  const [selectedIndices, setSelectedIndices] = useState<Set<string>>(new Set());

  // Build flat list of all gallery images
  const allImages = Object.entries(categorizedImages).flatMap(([category, entries]) =>
    entries.map((entry, index) => ({
      file: entry.file,
      preview: entry.preview,
      category: category as ImageCategory,
      uniqueKey: `${category}-${index}`,
      displayName: entry.file.name,
    }))
  );

  // Check if image already exists in room (by name + size)
  const existingKeys = new Set(
    existingFiles.map(f => `${f.name}-${f.size}`)
  );

  const availableImages = allImages.filter(
    img => !existingKeys.has(`${img.file.name}-${img.file.size}`)
  );

  const toggleImage = (uniqueKey: string) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(uniqueKey)) {
        next.delete(uniqueKey);
      } else if (next.size < maxImages) {
        next.add(uniqueKey);
      }
      return next;
    });
  };

  const handleCopy = () => {
    const selectedFiles = availableImages
      .filter(img => selectedIndices.has(img.uniqueKey))
      .map(img => img.file);
    const selectedPreviews = availableImages
      .filter(img => selectedIndices.has(img.uniqueKey))
      .map(img => img.preview);
    
    onCopy(selectedFiles, selectedPreviews);
    setSelectedIndices(new Set());
    onClose();
  };

  // Group by category for display
  const groupedByCategory = availableImages.reduce((acc, img) => {
    if (!acc[img.category]) {
      acc[img.category] = [];
    }
    acc[img.category].push(img);
    return acc;
  }, {} as Record<ImageCategory, typeof availableImages>);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-zinc-900 border border-white/10 rounded-[var(--radius-squircle-2xl)] max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="text-white font-bold text-lg">Copiar de la galería</h3>
                <p className="text-zinc-500 text-xs mt-1">
                  Seleccioná fotos para agregar a esta habitación ({selectedIndices.size}/{maxImages})
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={20} className="text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {availableImages.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon size={48} className="text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">
                    {existingFiles.length > 0
                      ? 'Todas las fotos de la galería ya están en esta habitación'
                      : 'No hay fotos en la galería. Subí fotos primero en el paso anterior.'}
                  </p>
                </div>
              ) : (
                Object.entries(groupedByCategory).map(([category, images]) => (
                  <div key={category}>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                      {CATEGORY_DISPLAY_ES[category as ImageCategory]}
                    </h4>
                    <div className="grid grid-cols-4 gap-3">
                      {images.map(img => {
                        const isSelected = selectedIndices.has(img.uniqueKey);
                        return (
                          <motion.button
                            key={img.uniqueKey}
                            onClick={() => toggleImage(img.uniqueKey)}
                            whileTap={{ scale: 0.95 }}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                              isSelected
                                ? 'border-indigo-500 ring-2 ring-indigo-500/50'
                                : 'border-white/10 hover:border-white/20'
                            }`}
                          >
                            <img
                              src={img.preview}
                              alt={img.displayName}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                <div className="bg-indigo-500 rounded-full p-1">
                                  <Check size={16} className="text-white" />
                                </div>
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {availableImages.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t border-white/10 bg-black/20">
                <button
                  onClick={() => setSelectedIndices(new Set())}
                  className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
                >
                  Limpiar selección
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    onClick={handleCopy}
                    disabled={selectedIndices.size === 0}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-2 bg-indigo-500 text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-600 transition-colors"
                  >
                    Copiar {selectedIndices.size} {selectedIndices.size === 1 ? 'foto' : 'fotos'}
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
