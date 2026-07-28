'use client';

import React, { useEffect, useRef } from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/dist/photoswipe.css';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface GallerySlide {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  msrc?: string; // Thumbnail source
  description?: string;
  blurDataURL?: string;
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
 * - Botones de navegación prev/next visibles
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
  const t = useTranslations();

  // Memoize the slide data to avoid recreating objects on every effect run
  const slideData = React.useMemo(
    () =>
      slides.map((slide) => ({
        src: slide.src,
        alt: slide.alt || '',
        width: slide.width || 1200,
        height: slide.height || 800,
        msrc: slide.msrc || slide.src,
      })),
    [slides]
  );

  useEffect(() => {
    if (!open || slideData.length === 0) return;

    let pswpInstance: any = null;

    // Inicializar PhotoSwipe
    const lightbox = new PhotoSwipeLightbox({
      dataSource: slideData,
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
      loop: slideData.length > 1,
      zoom: true,
      showAnimationDuration: 300,
      hideAnimationDuration: 250,
    });

    // Event listeners
    lightbox.on('close', () => {
      onClose();
    });

    lightbox.on('change', () => {
      if (pswpInstance && onViewSlide) {
        onViewSlide(pswpInstance.currIndex);
      }
    });

    // Guardar referencia a la instancia de PhotoSwipe y agregar botones de navegación
    lightbox.on('afterInit', () => {
      pswpInstance = lightbox.pswp;
      if (!pswpInstance || !pswpInstance.element) return;

      const pswpElement = pswpInstance.element;

      // Crear contenedor para los botones
      const navContainer = document.createElement('div');
      navContainer.className = 'pswp__custom-nav';
      navContainer.innerHTML = `
        <button type="button" class="pswp__custom-nav-btn pswp__custom-nav-btn--prev" aria-label="${t('ota.heroGallery.lightboxPrev')}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button type="button" class="pswp__custom-nav-btn pswp__custom-nav-btn--next" aria-label="${t('ota.heroGallery.lightboxNext')}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      `;

      // Agregar event listeners
      const prevBtn = navContainer.querySelector('.pswp__custom-nav-btn--prev');
      const nextBtn = navContainer.querySelector('.pswp__custom-nav-btn--next');

      prevBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        pswpInstance.prev();
      });

      nextBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        pswpInstance.next();
      });

      // Agregar contenedor al lightbox
      pswpElement.appendChild(navContainer);
    });

    // CRITICAL: Use loadAndOpen() instead of init() for programmatic dataSource
    // init() only binds click events to gallery elements, it doesn't open the lightbox
    // loadAndOpen() actually opens PhotoSwipe with the provided dataSource
    lightbox.loadAndOpen(openIndex, slideData);
    lightboxRef.current = lightbox;

    // Cleanup
    return () => {
      lightbox.destroy();
      lightboxRef.current = null;
    };
  }, [open, openIndex, slideData, onClose, onViewSlide, zoom, keyboard, t]);

  // PhotoSwipe renders directly to document.body, no wrapper needed
  return null;
}
