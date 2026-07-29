'use client';

import React, { useEffect, useRef } from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/dist/photoswipe.css';
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
 * GalleryLightbox - PhotoSwipe 5 wrapper with thumbnail strip + preload.
 *
 * Features:
 * - Fullscreen zoom & pan
 * - Native touch swipe
 * - Keyboard navigation (arrows, ESC)
 * - Prev/Next glass buttons
 * - Bottom thumbnail strip (up to 5 visible)
 * - Preloads next 2 images for instant navigation
 * - WCAG 2.1 AA accessible
 * - Liquid Glass styling
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

  // ── P2.4: Preload adjacent images for instant swipe ──────────────────
  useEffect(() => {
    if (!open || slideData.length <= 1) return;

    const offsets = [1, 2];
    const preloaded: HTMLImageElement[] = [];

    for (const offset of offsets) {
      const idx = (openIndex + offset) % slideData.length;
      const img = new Image();
      img.src = slideData[idx].src;
      preloaded.push(img);
    }

    return () => {
      // Let GC clean up — no explicit cancel needed for Image()
      preloaded.length = 0;
    };
  }, [open, openIndex, slideData]);

  // ── PhotoSwipe init ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open || slideData.length === 0) return;

    let pswpInstance: any = null;

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

    lightbox.on('close', () => {
      onClose();
    });

    lightbox.on('change', () => {
      if (pswpInstance && onViewSlide) {
        onViewSlide(pswpInstance.currIndex);
      }
      updateActiveThumbnail(pswpInstance);
    });

    lightbox.on('afterInit', () => {
      pswpInstance = lightbox.pswp;
      if (!pswpInstance || !pswpInstance.element) return;

      const pswpElement = pswpInstance.element;

      // ── Custom nav buttons (prev / next) ──────────────────────────
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

      pswpElement.appendChild(navContainer);

      // ── P2.3: Thumbnail strip ─────────────────────────────────────
      if (slideData.length > 1) {
        const strip = document.createElement('div');
        strip.className = 'pswp__thumbnail-strip';
        strip.setAttribute('role', 'tablist');
        strip.setAttribute('aria-label', 'Photo thumbnails');

        slideData.forEach((slide, i) => {
          const thumb = document.createElement('img');
          thumb.src = slide.msrc || slide.src;
          thumb.alt = slide.alt || `Photo ${i + 1}`;
          thumb.className = `pswp__thumbnail${i === openIndex ? ' pswp__thumbnail--active' : ''}`;
          thumb.dataset.index = String(i);
          thumb.setAttribute('role', 'tab');
          thumb.setAttribute('aria-selected', i === openIndex ? 'true' : 'false');
          thumb.setAttribute('aria-label', `View photo ${i + 1}`);

          thumb.addEventListener('click', (e) => {
            e.stopPropagation();
            if (pswpInstance) {
              pswpInstance.goTo(i);
            }
          });

          strip.appendChild(thumb);
        });

        pswpElement.appendChild(strip);

        // Scroll active thumbnail into view on navigation
        updateActiveThumbnail(pswpInstance);
      }
    });

    lightbox.loadAndOpen(openIndex, slideData);
    lightboxRef.current = lightbox;

    return () => {
      lightbox.destroy();
      lightboxRef.current = null;
    };
  }, [open, openIndex, slideData, onClose, onViewSlide, zoom, keyboard, t]);

  // PhotoSwipe renders to document.body — no wrapper needed
  return null;
}

/**
 * Syncs the active thumbnail highlight + scrolls it into view.
 */
function updateActiveThumbnail(pswpInstance: any) {
  if (!pswpInstance?.element) return;
  const strip = pswpInstance.element.querySelector('.pswp__thumbnail-strip');
  if (!strip) return;

  const thumbs = strip.querySelectorAll('.pswp__thumbnail');
  thumbs.forEach((thumb: Element, i: number) => {
    const isActive = i === pswpInstance.currIndex;
    thumb.classList.toggle('pswp__thumbnail--active', isActive);
    thumb.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  // Scroll active thumbnail into view within the strip
  const activeThumb = thumbs[pswpInstance.currIndex] as HTMLElement | undefined;
  if (activeThumb) {
    activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}
