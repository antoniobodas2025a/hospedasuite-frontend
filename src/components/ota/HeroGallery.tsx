'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// HERO GALLERY — Grid estilo Airbnb para página de hotel OTA
//
// Muestra las primeras 5 fotos del hotel en un grid interactivo:
// - Desktop: 1 foto grande (izq) + 2x2 grid (der) + botón "Ver todas"
// - Mobile: carrusel infinito con touch swipe + dots
// - Lightbox: navegación infinita con thumbnails
// ============================================================================

interface HeroGalleryProps {
  images: { url: string; alt?: string }[];
  hotelName: string;
}

// Hook para touch swipe con loop infinito
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Solo considerar swipe horizontal (más horizontal que vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) onSwipeLeft();
      else onSwipeRight();
    }
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchEnd };
}

export default function HeroGallery({ images, hotelName }: HeroGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);

  const displayImages = images.slice(0, 5);
  const totalDisplay = displayImages.length;

  // ─── Navegación infinita (loop) ─────────────────────────────────────────
  const nextMobile = useCallback(() => setMobileIndex((i) => (i + 1) % totalDisplay), [totalDisplay]);
  const prevMobile = useCallback(() => setMobileIndex((i) => (i - 1 + totalDisplay) % totalDisplay), [totalDisplay]);

  const nextLightbox = useCallback(() => setActiveIndex((i) => (i + 1) % images.length), [images.length]);
  const prevLightbox = useCallback(() => setActiveIndex((i) => (i - 1 + images.length) % images.length), [images.length]);

  const swipeHandlers = useSwipe(nextMobile, prevMobile);

  if (images.length === 0) return null;

  // ─── Keyboard navigation en lightbox ────────────────────────────────────
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

  // ─── Mobile: Carrusel infinito ──────────────────────────────────────────
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    return (
      <>
        <div
          className="relative w-full h-[45vh] min-h-[300px] bg-foreground select-none"
          onTouchStart={swipeHandlers.onTouchStart}
          onTouchEnd={swipeHandlers.onTouchEnd}
        >
          <Image
            src={displayImages[mobileIndex].url}
            alt={displayImages[mobileIndex].alt || hotelName}
            fill
            className="object-cover transition-opacity duration-300"
            priority
            sizes="100vw"
          />

          {/* Dots indicator — infinito */}
          {totalDisplay > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {displayImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setMobileIndex(i)}
                  className={cn(
                    'size-2 rounded-full transition-all',
                    i === mobileIndex ? 'bg-white w-6' : 'bg-white/50',
                  )}
                  aria-label={`Ver foto ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Flechas siempre visibles (loop infinito) */}
          {totalDisplay > 1 && (
            <>
              <button
                onClick={prevMobile}
                className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors z-10 active:scale-90"
              >
                <ChevronLeft size={20} className="text-foreground" />
              </button>
              <button
                onClick={nextMobile}
                className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors z-10 active:scale-90"
              >
                <ChevronRight size={20} className="text-foreground" />
              </button>
            </>
          )}

          {/* Photo count */}
          <button
            onClick={() => setLightboxOpen(true)}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold text-foreground shadow-lg hover:bg-white transition-colors z-10"
          >
            <Grid size={14} />
            {images.length} fotos
          </button>
        </div>

        {/* Lightbox mobile — infinito */}
        {lightboxOpen && (
          <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 z-10 size-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
            >
              <X size={20} />
            </button>
            <button
              onClick={prevLightbox}
              className="absolute left-4 top-1/2 -translate-y-1/2 size-12 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 z-10"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextLightbox}
              className="absolute right-4 top-1/2 -translate-y-1/2 size-12 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 z-10"
            >
              <ChevronRight size={24} />
            </button>
            <div className="relative w-full h-full">
              <Image
                src={images[activeIndex].url}
                alt={images[activeIndex].alt || hotelName}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm font-medium">
              {activeIndex + 1} / {images.length}
            </div>
          </div>
        )}
      </>
    );
  }

  // ─── Desktop: Grid estilo Airbnb ────────────────────────────────────────
  return (
    <>
      <div className="relative w-full h-[55vh] min-h-[400px] md:h-[500px] lg:h-[550px] rounded-b-3xl overflow-hidden group">
        <div className="grid grid-cols-1 md:grid-cols-4 h-full gap-1 p-1 bg-foreground">
          {/* Foto principal — ocupa 2 columnas */}
          <button
            onClick={() => { setActiveIndex(0); setLightboxOpen(true); }}
            className="md:col-span-2 relative overflow-hidden cursor-pointer"
          >
            <Image
              src={displayImages[0].url}
              alt={displayImages[0].alt || hotelName}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
          </button>

          {/* Grid 2x2 de thumbnails */}
          <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-1">
            {displayImages.slice(1, 5).map((img, i) => (
              <button
                key={i}
                onClick={() => { setActiveIndex(i + 1); setLightboxOpen(true); }}
                className="relative overflow-hidden cursor-pointer"
              >
                <Image
                  src={img.url}
                  alt={img.alt || `${hotelName} ${i + 2}`}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-110"
                  sizes="25vw"
                  quality={80}
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
              </button>
            ))}

            {/* Si hay menos de 5 fotos, rellenar con placeholder */}
            {displayImages.length < 5 &&
              Array.from({ length: 4 - (displayImages.length - 1) }).map((_, i) => (
                <div key={`placeholder-${i}`} className="bg-foreground/80" />
              ))}
          </div>
        </div>

        {/* Botón "Ver todas las fotos" */}
        {images.length > 5 && (
          <button
            onClick={() => setLightboxOpen(true)}
            className="absolute bottom-6 right-6 flex items-center gap-2 bg-white/95 backdrop-blur-sm px-5 py-3 rounded-xl text-sm font-bold text-foreground shadow-xl hover:bg-white hover:shadow-2xl transition-all active:scale-95 z-10"
          >
            <Grid size={16} />
            Ver las {images.length} fotos
          </button>
        )}
      </div>

      {/* Lightbox desktop — infinito */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 z-10 size-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <X size={24} />
          </button>

          {/* Flechas siempre visibles (loop infinito) */}
          <button
            onClick={prevLightbox}
            className="absolute left-6 top-1/2 -translate-y-1/2 size-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={nextLightbox}
            className="absolute right-6 top-1/2 -translate-y-1/2 size-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <ChevronRight size={28} />
          </button>

          {/* Imagen principal */}
          <div className="relative w-full max-w-5xl h-[80vh]">
            <Image
              src={images[activeIndex].url}
              alt={images[activeIndex].alt || hotelName}
              fill
              className="object-contain"
              sizes="80vw"
              priority
            />
          </div>

          {/* Thumbnails en la parte inferior */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 max-w-2xl overflow-x-auto px-4 pb-2">
              {images.slice(0, 10).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    'relative size-16 rounded-lg overflow-hidden border-2 transition-all shrink-0',
                    i === activeIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100',
                  )}
                >
                  <Image src={img.url} alt={img.alt || ''} fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}

          {/* Contador */}
          <div className="absolute top-6 left-6 text-white text-sm font-medium bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            {activeIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
