'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Lightbox from 'yet-another-react-lightbox';
import Inline from 'yet-another-react-lightbox/plugins/inline';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import type { GalleryItem } from '@/types';

// ============================================================================
// LIQUID GLASS STYLES — configuraciones reutilizables para YARL
// ============================================================================

const GLASS_STYLES = {
  root: {
    '--yarl__color_backdrop': 'rgba(0, 0, 0, 0.82)',
    '--yarl__color_button': 'rgba(255, 255, 255, 0.85)',
    '--yarl__color_button_active': 'rgba(255, 255, 255, 1)',
    '--yarl__color_button_disabled': 'rgba(255, 255, 255, 0.25)',
    '--yarl__size_button': '44px',
    '--yarl__icon_size': '24px',
  } as Record<string, string>,
  container: {
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  },
  button: {
    borderRadius: '14px',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

const GLASS_STYLES_INLINE = {
  ...GLASS_STYLES,
  root: {
    ...GLASS_STYLES.root,
    '--yarl__color_backdrop': 'transparent',
  } as Record<string, string>,
};

const THUMBNAILS_INLINE = {
  position: 'bottom' as const,
  width: 80,
  height: 56,
  border: 2,
  borderColor: 'rgba(255, 255, 255, 0.15)',
  borderRadius: 10,
  padding: 3,
  gap: 8,
  imageFit: 'cover' as const,
  vignette: true,
};

const THUMBNAILS_FULLSCREEN = {
  position: 'bottom' as const,
  width: 100,
  height: 70,
  border: 2,
  borderRadius: 12,
  padding: 4,
  gap: 8,
  imageFit: 'cover' as const,
  vignette: true,
};

// ============================================================================
// RENDERERS COMPARTIDOS
// ============================================================================

function renderSlide(slide: { src?: unknown; alt?: string }, rect: { width: number; height: number }) {
  if (typeof slide.src !== 'string') return null;
  return (
    <div style={{ position: 'relative', width: rect.width, height: rect.height }}>
      <Image
        fill
        alt={slide.alt ?? ''}
        src={slide.src}
        loading="eager"
        draggable={false}
        style={{ objectFit: 'cover', cursor: 'pointer' }}
        sizes={`${Math.ceil((rect.width / (typeof window !== 'undefined' ? window.innerWidth : 1200)) * 100)}vw`}
      />
    </div>
  );
}

function renderThumbnail(slide: { src?: unknown }, rect: { width: number; height: number }) {
  if (typeof slide.src !== 'string') return null;
  return (
    <div style={{ position: 'relative', width: rect.width, height: rect.height, borderRadius: 8, overflow: 'hidden' }}>
      <Image
        fill
        alt=""
        src={slide.src}
        loading="lazy"
        style={{ objectFit: 'cover' }}
        sizes={`${rect.width}px`}
      />
    </div>
  );
}

// ============================================================================
// ROOM GALLERY — Liquid Glass edition
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
        <Lightbox
          slides={slides}
          plugins={[Inline, Thumbnails, Counter]}
          inline={{
            style: {
              width: '100%',
              height: '100%',
              borderRadius: 0,
            },
          }}
          carousel={{
            imageFit: 'cover',
            spacing: 0,
            padding: 0,
          }}
          thumbnails={THUMBNAILS_INLINE}
          counter={{ container: { style: { top: 16, left: 16 } } }}
          controller={{ closeOnBackdropClick: false }}
          styles={GLASS_STYLES_INLINE}
          render={{
            slide: ({ slide, rect }) => renderSlide(slide, rect),
            thumbnail: ({ slide, rect }) => renderThumbnail(slide, rect),
          }}
        />

        {/* Lightbox fullscreen al hacer click en una foto */}
        <Lightbox
          open={open}
          close={() => setOpen(false)}
          index={index}
          slides={slides}
          plugins={[Thumbnails, Fullscreen, Zoom, Counter]}
          thumbnails={THUMBNAILS_FULLSCREEN}
          zoom={{ maxZoomPixelRatio: 4 }}
          carousel={{ finite: false, preload: 2 }}
          controller={{ closeOnBackdropClick: true }}
          styles={GLASS_STYLES}
          render={{
            slide: ({ slide, rect }) => renderSlide(slide, rect),
            thumbnail: ({ slide, rect }) => renderThumbnail(slide, rect),
          }}
        />
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
          className="relative block h-[260px] w-full rounded-[1.5rem] overflow-hidden shadow-lg shadow-black/10 group cursor-pointer"
          aria-label={`Ver galería de ${roomName}`}
        >
          <Image
            src={images[0]?.url ?? ''}
            alt={images[0]?.alt ?? roomName}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
            sizes="100vw"
            quality={90}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-xl text-white text-xs font-semibold border border-white/20 shadow-lg">
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
                  className="relative shrink-0 w-20 h-14 rounded-xl overflow-hidden transition-all duration-300 group"
                  aria-label={`Ver imagen ${realIndex + 1}`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? `${roomName} — ${realIndex + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors rounded-xl" />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Lightbox
        open={open}
        close={() => {
          setOpen(false);
          onClose?.();
        }}
        index={index}
        slides={slides}
        plugins={[Thumbnails, Fullscreen, Zoom, Counter]}
        thumbnails={THUMBNAILS_FULLSCREEN}
        zoom={{ maxZoomPixelRatio: 4 }}
        carousel={{ finite: false, preload: 2 }}
        controller={{ closeOnBackdropClick: true }}
        styles={GLASS_STYLES}
        render={{
          slide: ({ slide, rect }) => renderSlide(slide, rect),
          thumbnail: ({ slide, rect }) => renderThumbnail(slide, rect),
        }}
      />
    </>
  );
}
