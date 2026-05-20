'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { springSnappy } from '@/lib/mac2026/spring';
import { X, ChevronLeft, ChevronRight, Grid, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImageSizeUrl, type ImageBlurMeta } from '@/lib/image-config';
import { useIsMobile } from '@/hooks/useIsMediaQuery';
import { useTranslations } from 'next-intl';

// ============================================================================
// HERO GALLERY — Grid estilo Airbnb para pagina de hotel OTA
//
// Mac 2026 Design System:
// - Squircle radii via CSS custom properties
// - Z-index scale tokens (--z-lightbox, --z-overlay)
// - Spring physics for thumbnail transitions
// - Glass-pill primitives for overlays
// - Semantic overlay tokens instead of hardcoded colors
// ============================================================================

interface HeroGalleryProps {
  images: { url: string; alt?: string }[];
  hotelName: string;
  /** Optional activity pills to overlay on the hero */
  activityMessages?: { icon: string; text: string; color: string }[] | null;
  /** Blur placeholders for progressive image loading */
  blurs?: ImageBlurMeta;
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

// Imagen con estado de carga y fallback por error
function GalleryImage({
  src,
  alt,
  fill,
  className,
  sizes,
  quality,
  priority,
  loading,
  blurDataURL,
  placeholder,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  blurDataURL?: string;
  placeholder?: 'blur';
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={cn('bg-muted flex items-center justify-center', className)}>
        <Grid size={24} className="text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <>
      {/* Skeleton placeholder mientras carga */}
      {isLoading && fill && (
        <div className={cn('absolute inset-0 bg-muted animate-pulse', className)} />
      )}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        className={cn(isLoading && fill ? 'opacity-0' : 'opacity-100', 'transition-opacity duration-300', className)}
        sizes={sizes}
        quality={quality ?? 75}
        priority={priority}
        loading={loading ?? 'eager'}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onLoad={() => setIsLoading(false)}
        onError={() => { setError(true); setIsLoading(false); }}
      />
    </>
  );
}

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp,
  Clock,
}

const MUTED_MAP: Record<string, string> = {
  'text-success': 'bg-success-muted/80 border-success-border/60',
  'text-warning': 'bg-warning-muted/80 border-warning-border/60',
  'text-trust': 'bg-trust-muted/80 border-trust-border/60',
  'text-urgent': 'bg-urgent-muted/80 border-urgent-border/60',
}

export default function HeroGallery({ images, hotelName, activityMessages, blurs }: HeroGalleryProps) {
  const t = useTranslations();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);
  const isMobile = useIsMobile();

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
          aria-label={t('ota.heroGallery.viewPhoto', { num: 1, hotelName })}
        >
          <GalleryImage
            src={displayImages[0].url}
            alt={displayImages[0].alt || hotelName}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 100vw"
            quality={85}
            priority
            placeholder={blurs?.gallery_blurs?.[0]?.blur ? 'blur' : undefined}
            blurDataURL={blurs?.gallery_blurs?.[0]?.blur}
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
              aria-label={t('ota.heroGallery.viewPhoto', { num: i + 1, hotelName })}
            >
              <GalleryImage
                src={i === 0 ? img.url : getImageSizeUrl(img.url, 'thumb')}
                alt={img.alt || `${hotelName} ${i + 1}`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={i === 0 ? 85 : 75}
                priority={i === 0}
                placeholder={i === 0 && blurs?.gallery_blurs?.[0]?.blur ? 'blur' : undefined}
                blurDataURL={i === 0 ? blurs?.gallery_blurs?.[0]?.blur : undefined}
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
            aria-label={t('ota.heroGallery.viewPhoto', { num: 1, hotelName })}
          >
            <GalleryImage
              src={displayImages[0].url}
              alt={displayImages[0].alt || hotelName}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 66vw"
              quality={85}
              priority
              placeholder={blurs?.gallery_blurs?.[0]?.blur ? 'blur' : undefined}
              blurDataURL={blurs?.gallery_blurs?.[0]?.blur}
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
                  src={getImageSizeUrl(img.url, 'thumb')}
                  alt={img.alt || `${hotelName} ${i + 2}`}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-110"
                  sizes="33vw"
                  quality={75}
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
          aria-label={t('ota.heroGallery.viewPhoto', { num: 1, hotelName })}
        >
          <GalleryImage
            src={displayImages[0].url}
            alt={displayImages[0].alt || hotelName}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes={totalDisplay >= 6 ? '(max-width: 768px) 100vw, 66vw' : '(max-width: 768px) 100vw, 50vw'}
            quality={85}
            priority
            placeholder={blurs?.gallery_blurs?.[0]?.blur ? 'blur' : undefined}
            blurDataURL={blurs?.gallery_blurs?.[0]?.blur}
          />
          {/* Semantic overlay token: uses foreground opacity for hover feedback */}
          <div className="absolute inset-0 bg-foreground/0 hover:bg-foreground/[0.05] transition-colors" />
        </button>

        {displayImages.slice(1, 1 + thumbCount).map((img, i) => (
          <button
            key={i}
            onClick={() => { setActiveIndex(i + 1); setLightboxOpen(true); }}
            className="relative overflow-hidden cursor-pointer"
              aria-label={t('ota.heroGallery.viewPhoto', { num: i + 2, hotelName })}
          >
            <GalleryImage
              src={getImageSizeUrl(img.url, 'thumb')}
              alt={img.alt || `${hotelName} ${i + 2}`}
              fill
              className="object-cover transition-transform duration-500 hover:scale-110"
              sizes={totalDisplay >= 6 ? '33vw' : '25vw'}
              quality={75}
              loading="lazy"
            />
            {/* Semantic overlay token: uses foreground opacity for hover feedback */}
            <div className="absolute inset-0 bg-foreground/0 hover:bg-foreground/[0.05] transition-colors" />
          </button>
        ))}

        {/* Si hay mas de las que mostramos, overlay "Ver todas" */}
        {totalDisplay > (totalDisplay >= 6 ? 6 : 4) && (
          <div className="relative overflow-hidden">
            <GalleryImage
              src={getImageSizeUrl(displayImages[totalDisplay >= 6 ? 6 : 4].url, 'thumb')}
              alt={t('ota.heroGallery.viewAllPhotosAlt')}
              fill
              className="object-cover brightness-50"
              sizes={totalDisplay >= 6 ? '33vw' : '25vw'}
              loading="lazy"
            />
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute inset-0 flex items-center justify-center"
              aria-label={t('ota.heroGallery.viewAllPhotosOf', { count: images.length, hotelName })}
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
      {/* ─── HERO CONTAINER — Conditional: desktop grid OR mobile carousel ─── */}
      <div className="relative w-full h-[45vh] min-h-[300px] md:h-[500px] lg:h-[550px] rounded-b-[var(--radius-squircle-3xl)] overflow-hidden group bg-muted">
        {/* During SSR (isMobile === undefined), render desktop as default */}
        {isMobile === undefined || !isMobile ? (
          /* Desktop grid — only rendered on desktop */
          <div className="hidden md:block h-full">{getDesktopGrid()}</div>
        ) : (
          /* Mobile carousel — only rendered on mobile */
          <div
            className="absolute inset-0 select-none"
            onTouchStart={swipeHandlers.onTouchStart}
            onTouchEnd={swipeHandlers.onTouchEnd}
          >
            <GalleryImage
              src={displayImages[mobileIndex].url}
              alt={displayImages[mobileIndex].alt || hotelName}
              fill
              className="object-cover transition-opacity duration-300"
              sizes="100vw"
              quality={85}
              priority
              placeholder={blurs?.gallery_blurs?.[mobileIndex]?.blur ? 'blur' : undefined}
              blurDataURL={blurs?.gallery_blurs?.[mobileIndex]?.blur}
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
                    aria-label={t('ota.heroGallery.viewPhotoNum', { num: i + 1 })}
                  />
                ))}
              </div>
            )}

            {/* Flechas */}
            {totalDisplay > 1 && (
              <>
                <button
                  onClick={prevMobile}
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-card/90 shadow-lg flex items-center justify-center hover:bg-card transition-colors z-10 active:scale-90"
                  aria-label={t('ota.heroGallery.prevPhoto')}
                >
                  <ChevronLeft size={20} className="text-foreground" />
                </button>
                <button
                  onClick={nextMobile}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-card/90 shadow-lg flex items-center justify-center hover:bg-card transition-colors z-10 active:scale-90"
                  aria-label={t('ota.heroGallery.nextPhoto')}
                >
                  <ChevronRight size={20} className="text-foreground" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Activity Pills Overlay — subtle urgency signals on hero */}
        {activityMessages && activityMessages.length > 0 && (
          <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 flex flex-wrap gap-2 z-10 max-w-[calc(100%-6rem)]">
            {activityMessages.map((item, i) => {
              const Icon = ICON_MAP[item.icon] || TrendingUp
              const mutedClasses = MUTED_MAP[item.color] || 'bg-muted/80 border-border/60'
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-squircle-lg)] backdrop-blur-md border shadow-sm',
                    mutedClasses
                  )}
                >
                  <Icon size={12} className={item.color} />
                  <span className={cn('text-[11px] font-bold whitespace-nowrap', item.color)}>{item.text}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Boton "Ver todas las fotos" */}
        {images.length > (totalDisplay >= 6 ? 6 : 4) && (
          <button
            onClick={() => setLightboxOpen(true)}
            className="hidden md:flex absolute bottom-6 right-6 items-center gap-2 glass-pill px-5 py-3 text-sm font-bold text-foreground shadow-xl hover:shadow-2xl transition-all active:scale-95 z-10"
            aria-label={`Ver las ${images.length} fotos de ${hotelName}`}
          >
            <Grid size={16} />
            {t('ota.heroGallery.viewAllPhotos', { count: images.length })}
          </button>
        )}

        {/* Mobile photo count */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute bottom-4 right-4 md:hidden flex items-center gap-1.5 glass-pill px-3 py-1.5 text-xs font-bold text-foreground shadow-lg transition-colors z-10"
          aria-label={`Ver las ${images.length} fotos de ${hotelName}`}
        >
          <Grid size={14} />
          {t('ota.heroGallery.photoCount', { count: images.length })}
        </button>
      </div>

      {/* ─── Lightbox ───────────────────────────────────────────────────── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[var(--z-lightbox)] bg-black/95 backdrop-blur-xl flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={t('ota.heroGallery.galleryDialog')}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 z-10 size-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label={t('ota.heroGallery.closeGallery')}
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
            className="absolute right-6 top-1/2 -translate-y-1/2 size-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Siguiente foto"
          >
            <ChevronRight size={28} />
          </button>

          <div className="relative w-full max-w-5xl h-[80vh]">
            <GalleryImage
              src={getImageSizeUrl(images[activeIndex].url, 'full')}
              alt={images[activeIndex].alt || hotelName}
              fill
              className="object-contain"
              sizes="80vw"
              quality={90}
              priority
              placeholder={blurs?.gallery_blurs?.[activeIndex]?.blur ? 'blur' : undefined}
              blurDataURL={blurs?.gallery_blurs?.[activeIndex]?.blur}
            />
          </div>

          {/* Thumbnails con spring animations */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 max-w-2xl overflow-x-auto px-4 pb-2">
              {images.slice(0, 10).map((img, i) => (
                <motion.button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  transition={springSnappy()}
                  className={cn(
                    'relative size-16 rounded-[var(--radius-squircle-md)] overflow-hidden border-2 transition-all shrink-0',
                    i === activeIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100',
                  )}
                  aria-label={t('ota.heroGallery.goToPhoto', { num: i + 1 })}
                >
                  <GalleryImage
                    src={getImageSizeUrl(img.url, 'thumb')}
                    alt={img.alt || ''}
                    fill
                    className="object-cover"
                    sizes="100px"
                    quality={50}
                    loading="lazy"
                  />
                </motion.button>
              ))}
            </div>
          )}

          {/* Photo counter — glass-pill overlay */}
          <div className="absolute top-6 left-6 text-white text-sm font-medium glass-pill px-3 py-1.5">
            {activeIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
