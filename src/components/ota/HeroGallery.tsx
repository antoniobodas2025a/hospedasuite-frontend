'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// HERO GALLERY — Grid estilo Airbnb para pagina de hotel OTA
//
// Mejoras vs version anterior:
// - Sin hydration mismatch: CSS responsive en vez de window.innerWidth
// - preload en vez de priority (Next.js 16 compatible)
// - decoding="async" en todas las imagenes
// - Thumbnails con loading="lazy" + quality bajo
// - onError fallback por imagen
// - Soporta 1-9 fotos con layout adaptativo
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

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) onSwipeLeft();
      else onSwipeRight();
    }
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchEnd };
}

// Imagen con fallback por error de carga
function GalleryImage({
  src,
  alt,
  fill,
  className,
  sizes,
  quality,
  priority,
  loading,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={cn('bg-muted flex items-center justify-center', className)}>
        <Grid size={24} className="text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      quality={quality ?? 75}
      preload={priority}
      loading={loading ?? 'eager'}
      decoding="async"
      onError={() => setError(true)}
    />
  );
}

export default function HeroGallery({ images, hotelName }: HeroGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);

  // Mostrar hasta 9 fotos en el grid (antes solo 5)
  const displayImages = images.slice(0, 9);
  const totalDisplay = displayImages.length;

  // Navegacion infinita (loop)
  const nextMobile = useCallback(() => setMobileIndex((i) => (i + 1) % totalDisplay), [totalDisplay]);
  const prevMobile = useCallback(() => setMobileIndex((i) => (i - 1 + totalDisplay) % totalDisplay), [totalDisplay]);

  const nextLightbox = useCallback(() => setActiveIndex((i) => (i + 1) % images.length), [images.length]);
  const prevLightbox = useCallback(() => setActiveIndex((i) => (i - 1 + images.length) % images.length), [images.length]);

  const swipeHandlers = useSwipe(nextMobile, prevMobile);

  // Keyboard navigation en lightbox
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

  // Back button fix: push history state when lightbox opens, pop on close
  useEffect(() => {
    if (lightboxOpen) {
      history.pushState({ lightbox: true }, '');
    }

    const onPopState = () => {
      setLightboxOpen(false);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [lightboxOpen]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    if (window.location.hash === '#gallery') {
      history.back();
    }
  }, []);

  if (images.length === 0) return null;

  // Layouts adaptativos segun cantidad de fotos
  // 1 foto: full width
  // 2 fotos: 50/50
  // 3 fotos: 2/3 + 1/3 apilado
  // 4+ fotos: grid estilo Airbnb (hero + thumbnails)
  const getDesktopGrid = () => {
    if (totalDisplay === 1) {
      return (
        <button
          onClick={() => { setActiveIndex(0); setLightboxOpen(true); }}
          className="relative overflow-hidden cursor-pointer h-full"
          aria-label={`Ver foto 1 de ${hotelName}`}
        >
          <GalleryImage
            src={displayImages[0].url}
            alt={displayImages[0].alt || hotelName}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 100vw"
            priority
          />
        </button>
      );
    }

    if (totalDisplay === 2) {
      return (
        <div className="grid grid-cols-2 h-full gap-1">
          {displayImages.map((img, i) => (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); setLightboxOpen(true); }}
              className="relative overflow-hidden cursor-pointer"
              aria-label={`Ver foto ${i + 1} de ${hotelName}`}
            >
              <GalleryImage
                src={img.url}
                alt={img.alt || `${hotelName} ${i + 1}`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={i === 0}
              />
            </button>
          ))}
        </div>
      );
    }

    if (totalDisplay === 3) {
      return (
        <div className="grid grid-cols-3 h-full gap-1">
          <button
            onClick={() => { setActiveIndex(0); setLightboxOpen(true); }}
            className="col-span-2 relative overflow-hidden cursor-pointer"
            aria-label={`Ver foto 1 de ${hotelName}`}
          >
            <GalleryImage
              src={displayImages[0].url}
              alt={displayImages[0].alt || hotelName}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 66vw"
              priority
            />
          </button>
          <div className="flex flex-col gap-1">
            {displayImages.slice(1, 3).map((img, i) => (
              <button
                key={i}
                onClick={() => { setActiveIndex(i + 1); setLightboxOpen(true); }}
                className="relative flex-1 overflow-hidden cursor-pointer"
              >
                <GalleryImage
                  src={img.url}
                  alt={img.alt || `${hotelName} ${i + 2}`}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-110"
                  sizes="33vw"
                  quality={80}
                />
              </button>
            ))}
          </div>
        </div>
      );
    }

    // 4+ fotos: layout Airbnb con hero + grid de thumbnails
    const heroSpan = totalDisplay >= 6 ? 'md:col-span-2 md:row-span-2' : 'md:col-span-2';
    const thumbCount = Math.min(totalDisplay - 1, totalDisplay >= 6 ? 5 : 3);

    return (
      <div className={cn(
        'h-full gap-1',
        totalDisplay >= 6 ? 'grid grid-cols-1 md:grid-cols-3 md:grid-rows-2' : 'grid grid-cols-1 md:grid-cols-4'
      )}>
        <button
          onClick={() => { setActiveIndex(0); setLightboxOpen(true); }}
          className={cn('relative overflow-hidden cursor-pointer', heroSpan)}
          aria-label={`Ver foto 1 de ${hotelName}`}
        >
          <GalleryImage
            src={displayImages[0].url}
            alt={displayImages[0].alt || hotelName}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes={totalDisplay >= 6 ? '(max-width: 768px) 100vw, 66vw' : '(max-width: 768px) 100vw, 50vw'}
            priority
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
        </button>

        {displayImages.slice(1, 1 + thumbCount).map((img, i) => (
          <button
            key={i}
            onClick={() => { setActiveIndex(i + 1); setLightboxOpen(true); }}
            className="relative overflow-hidden cursor-pointer"
            aria-label={`Ver foto ${i + 2} de ${hotelName}`}
          >
            <GalleryImage
              src={img.url}
              alt={img.alt || `${hotelName} ${i + 2}`}
              fill
              className="object-cover transition-transform duration-500 hover:scale-110"
              sizes={totalDisplay >= 6 ? '33vw' : '25vw'}
              quality={80}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
          </button>
        ))}

        {/* Si hay mas de las que mostramos, overlay "Ver todas" */}
        {totalDisplay > (totalDisplay >= 6 ? 6 : 4) && (
          <div className="relative overflow-hidden">
            <GalleryImage
              src={displayImages[totalDisplay >= 6 ? 6 : 4].url}
              alt="Ver todas las fotos"
              fill
              className="object-cover brightness-50"
              sizes={totalDisplay >= 6 ? '33vw' : '25vw'}
              loading="lazy"
            />
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute inset-0 flex items-center justify-center"
              aria-label={`Ver las ${images.length} fotos de ${hotelName}`}
            >
              <span className="text-white font-bold text-sm">+{images.length - (totalDisplay >= 6 ? 6 : 4)} fotos</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ─── HERO CONTAINER ─────────────────────────────────────────────── */}
      <div className="relative w-full h-[45vh] min-h-[300px] md:h-[500px] lg:h-[550px] rounded-b-3xl overflow-hidden group bg-foreground">
        {getDesktopGrid()}

        {/* ─── Mobile: Carrusel (visible solo en pantallas pequenas) ────── */}
        <div
          className="absolute inset-0 md:hidden select-none"
          onTouchStart={swipeHandlers.onTouchStart}
          onTouchEnd={swipeHandlers.onTouchEnd}
        >
          <GalleryImage
            src={displayImages[mobileIndex].url}
            alt={displayImages[mobileIndex].alt || hotelName}
            fill
            className="object-cover transition-opacity duration-300"
            sizes="100vw"
            priority
          />

          {/* Dots indicator */}
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

          {/* Flechas */}
          {totalDisplay > 1 && (
            <>
              <button
                onClick={prevMobile}
                className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors z-10 active:scale-90"
                aria-label="Foto anterior"
              >
                <ChevronLeft size={20} className="text-foreground" />
              </button>
              <button
                onClick={nextMobile}
                className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors z-10 active:scale-90"
                aria-label="Siguiente foto"
              >
                <ChevronRight size={20} className="text-foreground" />
              </button>
            </>
          )}
        </div>

        {/* Boton "Ver todas las fotos" */}
        {images.length > (totalDisplay >= 6 ? 6 : 4) && (
          <button
            onClick={() => setLightboxOpen(true)}
            className="hidden md:flex absolute bottom-6 right-6 items-center gap-2 bg-white/95 backdrop-blur-sm px-5 py-3 rounded-xl text-sm font-bold text-foreground shadow-xl hover:bg-white hover:shadow-2xl transition-all active:scale-95 z-10"
            aria-label={`Ver las ${images.length} fotos de ${hotelName}`}
          >
            <Grid size={16} />
            Ver las {images.length} fotos
          </button>
        )}

        {/* Mobile photo count */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute bottom-4 right-4 md:hidden flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold text-foreground shadow-lg hover:bg-white transition-colors z-10"
          aria-label={`Ver las ${images.length} fotos de ${hotelName}`}
        >
          <Grid size={14} />
          {images.length} fotos
        </button>
      </div>

      {/* ─── Lightbox ───────────────────────────────────────────────────── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Galeria de fotos"
        >
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 z-10 size-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Cerrar galeria"
          >
            <X size={24} />
          </button>

          <button
            onClick={prevLightbox}
            className="absolute left-6 top-1/2 -translate-y-1/2 size-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Foto anterior"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={nextLightbox}
            className="absolute right-6 top-1/2 -translate-y/1/2 size-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Siguiente foto"
          >
            <ChevronRight size={28} />
          </button>

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

          <div className="relative w-full max-w-5xl h-[80vh]">
            <GalleryImage
              src={images[activeIndex].url}
              alt={images[activeIndex].alt || hotelName}
              fill
              className="object-contain"
              sizes="80vw"
              priority
            />
          </div>

          {/* Thumbnails */}
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
                  aria-label={`Ir a foto ${i + 1}`}
                >
                  <GalleryImage
                    src={img.url}
                    alt={img.alt || ''}
                    fill
                    className="object-cover"
                    sizes="64px"
                    quality={50}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="absolute top-6 left-6 text-white text-sm font-medium bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            {activeIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
