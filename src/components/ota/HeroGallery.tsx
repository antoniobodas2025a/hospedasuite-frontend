'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Grid, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImageSizeUrl, type ImageBlurMeta } from '@/lib/image-config';
import { useIsMobile } from '@/hooks/useIsMediaQuery';
import { useTranslations } from 'next-intl';
import GalleryImage from '@/components/ota/shared/GalleryImage';
import useSwipe from '@/hooks/useSwipe';
import GalleryLightbox from '@/components/ota/shared/GalleryLightbox';

// ============================================================================
// HERO GALLERY — Grid estilo Airbnb para pagina de hotel Channel
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

  // Resetear mobileIndex cuando cambian las imágenes (navegación entre hoteles)
  React.useEffect(() => {
    setMobileIndex(0);
  }, [images]);

  // Mostrar hasta 9 fotos en el grid (antes solo 5)
  const displayImages = useMemo(() => images.slice(0, 9), [images]);
  const totalDisplay = displayImages.length;

  // Memoizar slides del lightbox para evitar reinicialización de PhotoSwipe
  const lightboxSlides = useMemo(
    () =>
      images.map((img, i) => ({
        src: getImageSizeUrl(img.url, 'full'),
        alt: img.alt || hotelName,
        width: 1200,
        height: 800,
        msrc: blurs?.gallery_blurs?.[i]?.blur || img.url,
      })),
    [images, hotelName, blurs]
  );

  // Navegacion infinita (loop)
  const nextMobile = useCallback(() => setMobileIndex((i) => (i + 1) % totalDisplay), [totalDisplay]);
  const prevMobile = useCallback(() => setMobileIndex((i) => (i - 1 + totalDisplay) % totalDisplay), [totalDisplay]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: nextMobile,
    onSwipeRight: prevMobile,
  });

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
            className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out group-hover:motion-safe:scale-105"
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
        <div className="grid grid-cols-2 h-full gap-1.5">
          {displayImages.map((img, i) => (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); setLightboxOpen(true); }}
              className="relative overflow-hidden cursor-pointer group/btn"
              aria-label={t('ota.heroGallery.viewPhoto', { num: i + 1, hotelName })}
            >
              <GalleryImage
                src={i === 0 ? img.url : getImageSizeUrl(img.url, 'thumb')}
                alt={img.alt || `${hotelName} ${i + 1}`}
                fill
                className="object-cover transition-transform duration-700 group-hover/btn:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={i === 0 ? 85 : 75}
                priority={i === 0}
                placeholder={i === 0 && blurs?.gallery_blurs?.[0]?.blur ? 'blur' : undefined}
                blurDataURL={i === 0 ? blurs?.gallery_blurs?.[0]?.blur : undefined}
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover/btn:bg-foreground/[0.05] transition-colors" />
            </button>
          ))}
        </div>
      );
    }

    if (totalDisplay === 3) {
      return (
        <div className="grid grid-cols-3 h-full gap-1.5">
          <button
            onClick={() => { setActiveIndex(0); setLightboxOpen(true); }}
            className="col-span-2 relative overflow-hidden cursor-pointer group/btn"
            aria-label={t('ota.heroGallery.viewPhoto', { num: 1, hotelName })}
          >
            <GalleryImage
              src={displayImages[0].url}
              alt={displayImages[0].alt || hotelName}
              fill
              className="object-cover transition-transform duration-700 group-hover/btn:scale-105"
              sizes="(max-width: 768px) 100vw, 66vw"
              quality={85}
              priority
              placeholder={blurs?.gallery_blurs?.[0]?.blur ? 'blur' : undefined}
              blurDataURL={blurs?.gallery_blurs?.[0]?.blur}
            />
            <div className="absolute inset-0 bg-foreground/0 group-hover/btn:bg-foreground/[0.05] transition-colors" />
          </button>
          <div className="flex flex-col gap-1.5">
            {displayImages.slice(1, 3).map((img, i) => (
              <button
                key={i}
                onClick={() => { setActiveIndex(i + 1); setLightboxOpen(true); }}
                className="relative flex-1 overflow-hidden cursor-pointer group/btn"
                aria-label={t('ota.heroGallery.viewPhoto', { num: i + 2, hotelName })}
              >
                <GalleryImage
                  src={getImageSizeUrl(img.url, 'thumb')}
                  alt={img.alt || `${hotelName} ${i + 2}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover/btn:scale-110"
                  sizes="33vw"
                  quality={75}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-foreground/0 group-hover/btn:bg-foreground/[0.05] transition-colors" />
              </button>
            ))}
          </div>
        </div>
      );
    }

    // 4+ fotos: layout Airbnb con hero + grid de thumbnails
    const heroSpan = totalDisplay >= 6 ? 'md:col-span-2 md:row-span-2' : 'md:col-span-2';
    const thumbCount = Math.min(totalDisplay - 1, totalDisplay >= 6 ? 4 : 3);

    return (
      <div className={cn(
        'h-full gap-1.5',
        totalDisplay >= 6 ? 'grid grid-cols-1 md:grid-cols-4 md:grid-rows-2' : 'grid grid-cols-1 md:grid-cols-4'
      )}>
        <button
          onClick={() => { setActiveIndex(0); setLightboxOpen(true); }}
          className={cn('relative overflow-hidden cursor-pointer group/btn', heroSpan)}
          aria-label={t('ota.heroGallery.viewPhoto', { num: 1, hotelName })}
        >
          <GalleryImage
            src={displayImages[0].url}
            alt={displayImages[0].alt || hotelName}
            fill
            className="object-cover transition-transform duration-700 group-hover/btn:scale-105"
            sizes={totalDisplay >= 6 ? '(max-width: 768px) 100vw, 66vw' : '(max-width: 768px) 100vw, 50vw'}
            quality={85}
            priority
            placeholder={blurs?.gallery_blurs?.[0]?.blur ? 'blur' : undefined}
            blurDataURL={blurs?.gallery_blurs?.[0]?.blur}
          />
          <div className="absolute inset-0 bg-foreground/0 group-hover/btn:bg-foreground/[0.05] transition-colors" />
        </button>

        {displayImages.slice(1, 1 + thumbCount).map((img, i) => (
          <button
            key={i}
            onClick={() => { setActiveIndex(i + 1); setLightboxOpen(true); }}
            className="relative overflow-hidden cursor-pointer group/btn"
            aria-label={t('ota.heroGallery.viewPhoto', { num: i + 2, hotelName })}
          >
            <GalleryImage
              src={getImageSizeUrl(img.url, 'thumb')}
              alt={img.alt || `${hotelName} ${i + 2}`}
              fill
              className="object-cover transition-transform duration-500 group-hover/btn:scale-110"
              sizes={totalDisplay >= 6 ? '33vw' : '25vw'}
              quality={75}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-foreground/0 group-hover/btn:bg-foreground/[0.05] transition-colors" />
          </button>
        ))}

        {/* Si hay mas de las que mostramos, overlay "Ver todas" */}
        {totalDisplay > (totalDisplay >= 6 ? 6 : 4) && (
          <button
            onClick={() => { setActiveIndex(totalDisplay >= 6 ? 6 : 4); setLightboxOpen(true); }}
            className="relative overflow-hidden cursor-pointer group/btn"
            aria-label={t('ota.heroGallery.viewAllPhotosOf', { count: images.length, hotelName })}
          >
            <GalleryImage
              src={getImageSizeUrl(displayImages[totalDisplay >= 6 ? 6 : 4].url, 'thumb')}
              alt={t('ota.heroGallery.viewAllPhotosAlt')}
              fill
              className="object-cover brightness-50"
              sizes={totalDisplay >= 6 ? '33vw' : '25vw'}
              loading="lazy"
            />
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm group-hover/btn:brightness-110 transition-all">
              {t('ota.heroGallery.morePhotos', { count: images.length - (totalDisplay >= 6 ? 6 : 4) })}
            </span>
          </button>
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
            onTouchMove={swipeHandlers.onTouchMove}
            onTouchEnd={swipeHandlers.onTouchEnd}
          >
            <GalleryImage
              src={displayImages[mobileIndex].url}
              alt={displayImages[mobileIndex].alt || hotelName}
              fill
              className="object-cover motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out"
              sizes="100vw"
              quality={85}
              priority
              placeholder={blurs?.gallery_blurs?.[mobileIndex]?.blur ? 'blur' : undefined}
              blurDataURL={blurs?.gallery_blurs?.[mobileIndex]?.blur}
            />

            {/* Dots indicator — 44px touch targets */}
            {totalDisplay > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-0 z-10">
                {displayImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setMobileIndex(i)}
                    className="relative flex items-center justify-center min-w-[44px] min-h-[44px]"
                    aria-label={t('ota.heroGallery.viewPhotoNum', { num: i + 1 })}
                    aria-current={i === mobileIndex ? 'true' : undefined}
                  >
                    <span className={cn(
                      'block size-2 rounded-full motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out',
                      i === mobileIndex ? 'bg-white w-6' : 'bg-white/50',
                    )} />
                  </button>
                ))}
              </div>
            )}

            {/* Flechas — visibles en mobile, hover en desktop */}
            {totalDisplay > 1 && (
              <>
                <button
                  onClick={prevMobile}
                  className="flex md:opacity-0 md:group-hover:opacity-100 absolute left-3 top-1/2 -translate-y-1/2 size-11 rounded-full bg-card/90 shadow-lg items-center justify-center hover:bg-card motion-safe:transition-all motion-safe:duration-200 z-10 active:motion-safe:scale-90"
                  aria-label={t('ota.heroGallery.prevPhoto')}
                >
                  <ChevronLeft size={20} className="text-foreground" />
                </button>
                <button
                  onClick={nextMobile}
                  className="flex md:opacity-0 md:group-hover:opacity-100 absolute right-3 top-1/2 -translate-y-1/2 size-11 rounded-full bg-card/90 shadow-lg items-center justify-center hover:bg-card motion-safe:transition-all motion-safe:duration-200 z-10 active:motion-safe:scale-90"
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
          <div className="absolute bottom-14 left-4 md:bottom-6 md:left-6 flex flex-wrap gap-2 z-10 max-w-[calc(100%-6rem)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
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
            onClick={() => { setActiveIndex(0); setLightboxOpen(true); }}
            className="hidden md:flex absolute bottom-6 right-6 items-center gap-2 glass-pill px-5 py-3 text-sm font-bold text-foreground shadow-xl hover:shadow-2xl motion-safe:transition-all motion-safe:duration-200 active:motion-safe:scale-95 z-10"
            aria-label={t('ota.heroGallery.viewAllPhotosOf', { count: images.length, hotelName })}
          >
            <Grid size={16} />
            {t('ota.heroGallery.viewAllPhotos', { count: images.length })}
          </button>
        )}

        {/* Mobile photo count — 44px min touch target */}
        <button
          onClick={() => { setActiveIndex(0); setLightboxOpen(true); }}
          className="absolute bottom-4 right-4 md:hidden flex items-center gap-1.5 glass-pill px-3 min-h-[44px] text-xs font-bold text-foreground shadow-lg motion-safe:transition-colors motion-safe:duration-200 z-10"
          aria-label={t('ota.heroGallery.viewAllPhotosOf', { count: images.length, hotelName })}
        >
          <Grid size={14} />
          {t('ota.heroGallery.photoCount', { count: images.length })}
        </button>
      </div>

      {/* ─── Lightbox ───────────────────────────────────────────────────── */}
      <GalleryLightbox
        slides={lightboxSlides}
        open={lightboxOpen}
        openIndex={activeIndex}
        onClose={() => setLightboxOpen(false)}
        zoom={{ maxZoomLevel: 3 }}
      />
    </>
  );
}
