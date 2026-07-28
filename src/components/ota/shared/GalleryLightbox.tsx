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
      // Custom animation timing for smoother transitions
      showAnimationDuration: 300,
      hideAnimationDuration: 250,
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

    // Agregar flechas de navegación UI (PhotoSwipe 5 no las incluye por defecto)
    lightbox.on('uiRegister', () => {
      const pswp = lightbox.pswp;
      if (!pswp) return;

      // Botón Previous — 44px min touch target for WCAG 2.1 AA
      const prevButton = document.createElement('button');
      prevButton.className =
        'pswp__button pswp__button--arrow pswp__button--arrow--prev';
      prevButton.setAttribute('aria-label', 'Imagen anterior');
      prevButton.setAttribute('type', 'button');
      prevButton.style.cssText =
        'min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;position:absolute;left:8px;top:50%;transform:translateY(-50%);z-index:50;padding:10px;background:rgba(0,0,0,0.5);border-radius:50%;border:none;cursor:pointer;color:white;transition:background 0.2s';
      prevButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      `;
      prevButton.addEventListener('click', () => {
        pswp.prev();
      });
      prevButton.addEventListener('mouseenter', () => {
        prevButton.style.background = 'rgba(0,0,0,0.7)';
      });
      prevButton.addEventListener('mouseleave', () => {
        prevButton.style.background = 'rgba(0,0,0,0.5)';
      });

      // Botón Next — 44px min touch target for WCAG 2.1 AA
      const nextButton = document.createElement('button');
      nextButton.className =
        'pswp__button pswp__button--arrow pswp__button--arrow--next';
      nextButton.setAttribute('aria-label', 'Imagen siguiente');
      nextButton.setAttribute('type', 'button');
      nextButton.style.cssText =
        'min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;position:absolute;right:8px;top:50%;transform:translateY(-50%);z-index:50;padding:10px;background:rgba(0,0,0,0.5);border-radius:50%;border:none;cursor:pointer;color:white;transition:background 0.2s';
      nextButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      `;
      nextButton.addEventListener('click', () => {
        pswp.next();
      });
      nextButton.addEventListener('mouseenter', () => {
        nextButton.style.background = 'rgba(0,0,0,0.7)';
      });
      nextButton.addEventListener('mouseleave', () => {
        nextButton.style.background = 'rgba(0,0,0,0.5)';
      });

      // Agregar botones al DOM de PhotoSwipe
      const wrapper = pswp.element?.querySelector('.pswp__wrapper');
      if (wrapper) {
        wrapper.appendChild(prevButton);
        wrapper.appendChild(nextButton);
      }
    });

    // Cleanup
    return () => {
      lightbox.destroy();
      lightboxRef.current = null;
    };
  }, [open, openIndex, slideData, onClose, onViewSlide, zoom, keyboard]);

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
