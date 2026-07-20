'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORY_DISPLAY_ES, CATEGORY_PRIORITY } from '@/lib/image-category';
import type { CategorizedImage, ImageCategory } from '@/types';

// ============================================================================
// CATEGORIZED HERO GALLERY — Category-grouped display for hotel images
//
// Groups images by category in priority order (exterior → lobby → ...).
// Each group has a visible Spanish label. Responsive grid with aspect-ratio
// preservation (no cropping). Lightbox for full-screen viewing.
// ============================================================================

interface CategorizedHeroGalleryProps {
  images: CategorizedImage[];
  hotelName: string;
}

/** Group images by category, ordered by CATEGORY_PRIORITY */
function groupByCategory(images: CategorizedImage[]): Map<ImageCategory, CategorizedImage[]> {
  const groups = new Map<ImageCategory, CategorizedImage[]>();

  // Initialize groups in priority order
  for (const category of CATEGORY_PRIORITY) {
    const categoryImages = images
      .filter((img) => img.category === category)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (categoryImages.length > 0) {
      groups.set(category, categoryImages);
    }
  }

  return groups;
}

export default function CategorizedHeroGallery({
  images,
  hotelName,
}: CategorizedHeroGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const grouped = groupByCategory(images);
  // Flat list for lightbox navigation (preserves category priority order)
  const flatImages = Array.from(grouped.entries()).flatMap(([, imgs]) => imgs);

  const nextLightbox = useCallback(
    () => setActiveIndex((i) => (i + 1) % flatImages.length),
    [flatImages.length]
  );
  const prevLightbox = useCallback(
    () => setActiveIndex((i) => (i - 1 + flatImages.length) % flatImages.length),
    [flatImages.length]
  );

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') nextLightbox();
      if (e.key === 'ArrowLeft') prevLightbox();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, nextLightbox, prevLightbox]);

  const openLightbox = useCallback((globalIndex: number) => {
    setActiveIndex(globalIndex);
    setLightboxOpen(true);
  }, []);

  if (images.length === 0) return null;

  // Track global index across groups for lightbox
  let globalIdx = 0;

  return (
    <>
      {/* ─── Category-grouped grid ─── */}
      <div className="w-full space-y-6">
        {Array.from(grouped.entries()).map(([category, categoryImages]) => (
          <section key={category} aria-labelledby={`category-${category}`}>
            {/* Category label */}
            <h3
              id={`category-${category}`}
              className="text-lg font-bold text-foreground mb-3 px-1"
            >
              {CATEGORY_DISPLAY_ES[category]}
            </h3>

            {/* Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {categoryImages.map((img) => {
                const currentGlobalIdx = globalIdx++;
                return (
                  <button
                    key={`${img.url}-${currentGlobalIdx}`}
                    onClick={() => openLightbox(currentGlobalIdx)}
                    className="relative aspect-[4/3] overflow-hidden rounded-lg cursor-pointer group bg-muted"
                    aria-label={`${CATEGORY_DISPLAY_ES[category]} — foto ${currentGlobalIdx + 1} de ${hotelName}`}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt || `${hotelName} — ${CATEGORY_DISPLAY_ES[category]}`}
                      fill
                      className="object-contain transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      quality={80}
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/[0.05] transition-colors" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* ─── Lightbox ─── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[var(--z-lightbox)] bg-black/95 backdrop-blur-xl flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Galería de fotos"
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 z-10 size-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Cerrar galería"
          >
            <X size={24} />
          </button>

          {/* Navigation */}
          {flatImages.length > 1 && (
            <>
              <button
                onClick={prevLightbox}
                className="absolute left-6 top-1/2 -translate-y-1/2 size-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
                aria-label="Foto anterior"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={nextLightbox}
                className="absolute right-6 top-1/2 -translate-y-1/2 size-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
                aria-label="Siguiente foto"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          {/* Active image */}
          <div className="relative w-full max-w-5xl h-[80vh]">
            <Image
              src={flatImages[activeIndex].url}
              alt={flatImages[activeIndex].alt || hotelName}
              fill
              className="object-contain"
              sizes="80vw"
              quality={90}
            />
          </div>

          {/* Category badge + counter */}
          <div className="absolute top-6 left-6 flex items-center gap-3">
            <span className="text-white text-sm font-medium bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
              {CATEGORY_DISPLAY_ES[flatImages[activeIndex].category]}
            </span>
            <span className="text-white text-sm font-medium bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
              {activeIndex + 1} / {flatImages.length}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
