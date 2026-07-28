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

    // Agregar botones de navegación custom después de que PhotoSwipe se inicialice
    lightbox.on('afterInit', () => {
      pswpInstance = lightbox.pswp;
      if (!pswpInstance || !pswpInstance.element) return;

      const pswpElement = pswpInstance.element;

      // Crear contenedor para los botones
      const navContainer = document.createElement('div');
      navContainer.className = 'pswp__custom-nav';
      navContainer.style.cssText = `
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        transform: translateY(-50%);
        display: flex;
        justify-content: space-between;
        padding: 0 16px;
        pointer-events: none;
        z-index: 60;
      `;

      // Botón Previous
      const prevButton = document.createElement('button');
      prevButton.className = 'pswp__custom-nav-btn pswp__custom-nav-btn--prev';
      prevButton.setAttribute('aria-label', 'Imagen anterior');
      prevButton.setAttribute('type', 'button');
      prevButton.style.cssText = `
        pointer-events: auto;
        width: 48px;
        height: 48px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s ease;
        color: white;
      `;
      prevButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      `;
      prevButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        pswpInstance.prev();
      });
      prevButton.addEventListener('mouseenter', () => {
        prevButton.style.background = 'rgba(0, 0, 0, 0.8)';
        prevButton.style.transform = 'scale(1.08)';
      });
      prevButton.addEventListener('mouseleave', () => {
        prevButton.style.background = 'rgba(0, 0, 0, 0.6)';
        prevButton.style.transform = 'scale(1)';
      });

      // Botón Next
      const nextButton = document.createElement('button');
      nextButton.className = 'pswp__custom-nav-btn pswp__custom-nav-btn--next';
      nextButton.setAttribute('aria-label', 'Imagen siguiente');
      nextButton.setAttribute('type', 'button');
      nextButton.style.cssText = `
        pointer-events: auto;
        width: 48px;
        height: 48px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s ease;
        color: white;
      `;
      nextButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      `;
      nextButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        pswpInstance.next();
      });
      nextButton.addEventListener('mouseenter', () => {
        nextButton.style.background = 'rgba(0, 0, 0, 0.8)';
        nextButton.style.transform = 'scale(1.08)';
      });
      nextButton.addEventListener('mouseleave', () => {
        nextButton.style.background = 'rgba(0, 0, 0, 0.6)';
        nextButton.style.transform = 'scale(1)';
      });

      // Agregar botones al contenedor
      navContainer.appendChild(prevButton);
      navContainer.appendChild(nextButton);

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
  }, [open, openIndex, slideData, onClose, onViewSlide, zoom, keyboard]);

  // PhotoSwipe renders directly to document.body, no wrapper needed
  return null;
}
