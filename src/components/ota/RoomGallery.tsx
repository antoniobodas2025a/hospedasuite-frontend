'use client';

import { useState, useCallback, Suspense } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import type { GalleryItem } from '@/types';

// CSS imports at top level (tree-shaken by PostCSS, minimal JS impact)
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/counter.css';

// Dynamic import of the YARL lightbox component (the heavy part ~50KB)
// Plugins are imported inside the wrapper component, not via next/dynamic
// because they are functions, not React components.
const LightboxWrapper = dynamic(
  () => import('@/components/ota/RoomGalleryLightbox'),
  {
    loading: () => (
      <div className="animate-pulse bg-muted w-full h-full flex items-center justify-center">
        <div className="size-12 rounded-full bg-muted-foreground/10" />
      </div>
    ),
    ssr: false,
  },
);

// ============================================================================
// ROOM GALLERY — Liquid Glass edition (dynamic YARL imports)
// ============================================================================

interface RoomGalleryProps {
  images: GalleryItem[];
  roomName: string;
  onClose?: () => void;
  variant?: 'inline' | 'compact';
}

export default function RoomGallery({ images, roomName, onClose, variant = 'inline' }: RoomGalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const slides = images.map((img) => ({
    src: img.url,
    alt: img.alt ?? roomName,
    description: img.caption,
  }));

  const handleThumbnailClick = useCallback((i: number) => {
    setIndex(i);
    setOpen(true);
  }, []);

  // --------------------------------------------------------------------------
  // MODO INLINE: carrusel empotrado en el panel izquierdo (desktop)
  // --------------------------------------------------------------------------
  if (variant === 'inline') {
    return (
      <>
        <Suspense fallback={
          <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
            <div className="size-16 rounded-full bg-muted-foreground/10" />
          </div>
        }>
          <LightboxWrapper
            variant="inline"
            slides={slides}
            open={open}
            openIndex={index}
            onOpen={setOpen}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      </>
    );
  }

  // --------------------------------------------------------------------------
  // MODO COMPACTO: preview glass con thumbnails (mobile)
  // --------------------------------------------------------------------------
  return (
    <>
      <div className="space-y-3">
        {/* Imagen principal glass */}
        <button
          type="button"
          onClick={() => { setIndex(0); setOpen(true); }}
          className="relative block h-[260px] w-full rounded-[1.5rem] overflow-hidden shadow-lg shadow-elev-2 group cursor-pointer"
          aria-label={`Ver galería de ${roomName}`}
        >
          <Image
            src={images[0]?.url ?? ''}
            alt={images[0]?.alt ?? roomName}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
            sizes="100vw"
            quality={85}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 glass-pill text-white text-xs font-semibold shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              {images.length} foto{images.length !== 1 ? 's' : ''}
            </span>
          </div>
        </button>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 px-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {images.slice(1).map((img, i) => {
              const realIndex = i + 1;
              return (
                <button
                  key={realIndex}
                  type="button"
                  onClick={() => handleThumbnailClick(realIndex)}
                  className="relative shrink-0 w-20 h-14 rounded-[var(--radius-squircle-lg)] overflow-hidden transition-all duration-300 group"
                  aria-label={`Ver imagen ${realIndex + 1}`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? `${roomName} — ${realIndex + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                    quality={50}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors rounded-[var(--radius-squircle-lg)]" />
                  <div className="absolute inset-0 rounded-[var(--radius-squircle-lg)] ring-1 ring-white/20" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        <LightboxWrapper
          variant="compact"
          slides={slides}
          open={open}
          openIndex={index}
          onOpen={setOpen}
          onClose={() => {
            setOpen(false);
            onClose?.();
          }}
        />
      </Suspense>
    </>
  );
}
