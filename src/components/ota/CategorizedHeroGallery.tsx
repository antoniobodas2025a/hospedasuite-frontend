'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { CATEGORY_DISPLAY_ES, CATEGORY_PRIORITY } from '@/lib/image-category';
import type { CategorizedImage, ImageCategory } from '@/types';
import GalleryImage from '@/components/ota/shared/GalleryImage';
import { DynamicGalleryLightbox as GalleryLightbox } from '@/components/ota/shared/DynamicGalleryLightbox';

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

  // Memoizar agrupamiento por categoría (solo recalcular cuando cambien las imágenes)
  const grouped = useMemo(() => groupByCategory(images), [images]);
  // Flat list for lightbox navigation (preserves category priority order)
  const flatImages = useMemo(
    () => Array.from(grouped.entries()).flatMap(([, imgs]) => imgs),
    [grouped]
  );

  // Memoize lightbox slides to avoid re-creating objects on every render
  const lightboxSlides = useMemo(
    () =>
      flatImages.map((img) => ({
        src: img.url,
        alt: img.alt || hotelName,
        width: 1200,
        height: 800,
      })),
    [flatImages, hotelName]
  );

  const openLightbox = useCallback((globalIndex: number) => {
    setActiveIndex(globalIndex);
    setLightboxOpen(true);
  }, []);

  // Stable callback to prevent useEffect re-execution in GalleryLightbox
  const handleClose = useCallback(() => setLightboxOpen(false), []);

  if (images.length === 0) return null;

  // Track global index across groups for lightbox
  let globalIdx = 0;

  return (
    <>
      {/* ─── Category-grouped grid ─── */}
      <div className="w-full space-y-8">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryImages.map((img) => {
                const currentGlobalIdx = globalIdx++;
                return (
                  <button
                    key={`${img.url}-${currentGlobalIdx}`}
                    onClick={() => openLightbox(currentGlobalIdx)}
                    className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-squircle-lg)] cursor-pointer group bg-muted"
                    aria-label={`${CATEGORY_DISPLAY_ES[category]} — foto ${currentGlobalIdx + 1} de ${hotelName}`}
                  >
                    <GalleryImage
                      src={img.url}
                      alt={img.alt || `${hotelName} — ${CATEGORY_DISPLAY_ES[category]}`}
                      fill
                      className="object-contain motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out group-hover:motion-safe:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      quality={80}
                      loading="lazy"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/[0.05] motion-safe:transition-colors motion-safe:duration-200" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* ─── Lightbox ─── */}
      <GalleryLightbox
        slides={lightboxSlides}
        open={lightboxOpen}
        openIndex={activeIndex}
        onClose={handleClose}
        zoom={{ maxZoomLevel: 3 }}
      />
    </>
  );
}
