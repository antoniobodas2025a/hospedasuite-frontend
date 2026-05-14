'use client';

import Image from 'next/image';
import Lightbox from 'yet-another-react-lightbox';
import Inline from 'yet-another-react-lightbox/plugins/inline';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Counter from 'yet-another-react-lightbox/plugins/counter';

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
// LIGHTBOX WRAPPER — dynamically imported to defer YARL bundle
// ============================================================================

interface LightboxWrapperProps {
  variant: 'inline' | 'compact';
  slides: { src: string; alt: string; description?: string }[];
  open: boolean;
  openIndex: number;
  onOpen: (v: boolean) => void;
  onClose: () => void;
}

export default function RoomGalleryLightbox({
  variant,
  slides,
  open,
  openIndex,
  onOpen,
  onClose,
}: LightboxWrapperProps) {
  // --------------------------------------------------------------------------
  // MODO INLINE: carrusel empotrado + fullscreen lightbox
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
          close={() => onOpen(false)}
          index={openIndex}
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
  // MODO COMPACTO: fullscreen lightbox only
  // --------------------------------------------------------------------------
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={openIndex}
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
  );
}
