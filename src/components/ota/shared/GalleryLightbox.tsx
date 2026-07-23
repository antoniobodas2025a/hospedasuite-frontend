'use client';

import React, { useEffect, useRef } from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/dist/photoswipe.css';
import { cn } from '@/lib/utils';

interface GallerySlide {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  msrc?: string; // Thumbnail source
}

interface GalleryLightboxProps {
  slides: GallerySlide[];
  open: boolean;
  openIndex: number;
  onClose: () => void;
  onViewSlide?: (index: number) => void;
  className?: string;
  zoom?: {
    maxZoomLevel?: number;
  };
  keyboard?: {
    escape?: boolean;
    arrows?: boolean;
  };
}

/**
 * GalleryLightbox - Wrapper de PhotoSwipe 5 para galerías de fotos
 * 
 * Características:
 * - Fullscreen con zoom y pan
 * - Swipe táctil nativo
 * - Navegación con teclado (flechas, ESC)
 * - Accesibilidad WCAG 2.1 AA
 * - Lazy loading de imágenes
 * - Estilos Liquid Glass
 * 
 * Uso:
 * ```tsx
 * <GalleryLightbox
 *   slides={[
 *     { src: '/hotel1.jpg', alt: 'Hotel exterior', width: 1200, height: 800 },
 *     { src: '/hotel2.jpg', alt: 'Hotel lobby', width: 1200, height: 800 },
 *   ]}
 *   open={lightboxOpen}
 *   openIndex={activeIndex}
 *   onClose={() => setLightboxOpen(false)}
 *   zoom={{ maxZoomLevel: 3 }}
 * />
 * ```
 */
export default function GalleryLightbox({
  slides,
  open,
  openIndex,
  onClose,
  onViewSlide,
  className,
  zoom = { maxZoomLevel: 3 },
  keyboard = { escape: true, arrows: true },
}: GalleryLightboxProps) {
  const lightboxRef = useRef<PhotoSwipeLightbox | null>(null);

  useEffect(() => {
    if (!open || slides.length === 0) return;

    // Inicializar PhotoSwipe
    const lightbox = new PhotoSwipeLightbox({
      slides: slides.map((slide) => ({
        src: slide.src,
        alt: slide.alt || '',
        width: slide.width || 1200,
        height: slide.height || 800,
        msrc: slide.msrc || slide.src,
      })),
      index: openIndex,
      pswpModule: () => import('photoswipe'),
      bgOpacity: 0.9,
      showHideAnimationType: 'fade',
      allowPanToNext: false,
      closeOnVerticalDrag: true,
      escKey: keyboard.escape,
      arrowKeys: keyboard.arrows,
      wheelToZoom: true,
      pinchToClose: false,
      loop: slides.length > 1,
      zoom: true,
    });

    // Event listeners
    lightbox.on('close', () => {
      onClose();
    });

    lightbox.on('change', () => {
      const pswp = lightbox.pswp;
      if (pswp && onViewSlide) {
        onViewSlide(pswp.currIndex);
      }
    });

    lightbox.init();
    lightboxRef.current = lightbox;

    // Cleanup
    return () => {
      lightbox.destroy();
      lightboxRef.current = null;
    };
  }, [open, openIndex, slides, onClose, onViewSlide, zoom, keyboard]);

  // No renderizar nada si está cerrado
  if (!open) return null;

  return (
    <div
      className={cn(
        'pswp-gallery',
        className
      )}
      data-testid="gallery-lightbox"
    >
      {/* PhotoSwipe renderiza automáticamente en el DOM */}
    </div>
  );
}
