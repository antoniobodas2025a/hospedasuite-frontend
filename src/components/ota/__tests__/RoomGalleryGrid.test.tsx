// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import RoomGalleryGrid from '../RoomGalleryGrid';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      'ota.roomGallery.viewImage': 'Ver imagen {index}',
      'ota.roomGallery.viewAllPhotos': 'Ver todas las fotos',
      'ota.roomGallery.photoCounter': 'Foto {current} de {total}',
      'ota.roomGallery.errorLoading': 'Error al cargar fotos',
      'ota.roomGallery.retry': 'Reintentar',
      'ota.heroGallery.errorLoading': 'Error al cargar imagen',
    };
    let text = messages[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; preload?: boolean; blurDataURL?: string; placeholder?: string; priority?: boolean; fetchPriority?: 'high' | 'low' | 'auto' }) => {
    const { onLoad, onError, alt, fill, preload, blurDataURL, placeholder, priority, sizes, loading, fetchPriority, ...rest } = props;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        {...rest}
        sizes={sizes}
        loading={loading}
        onLoad={onLoad}
        onError={onError}
        data-testid="gallery-image"
        data-priority={priority ? 'true' : undefined}
        data-fetchpriority={fetchPriority}
      />
    );
  },
}));

// Mock DynamicGalleryLightbox
vi.mock('@/components/ota/shared/DynamicGalleryLightbox', () => ({
  DynamicGalleryLightbox: () => null,
}));

// Mock SkeletonImage
vi.mock('@/components/ota/SkeletonImage', () => ({
  SkeletonImage: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-image" className={className} />
  ),
}));

const mockImages = [
  { url: '/test1.jpg', alt: 'Hero' },
  { url: '/test2.jpg', alt: 'Bed' },
  { url: '/test3.jpg', alt: 'Bathroom' },
  { url: '/test4.jpg', alt: 'View' },
  { url: '/test5.jpg', alt: 'Amenities' },
  { url: '/test6.jpg', alt: 'Details' },
];

describe('RoomGalleryGrid - Error Boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays a placeholder when an individual image fails to load', async () => {
    const { container } = render(
      <RoomGalleryGrid images={mockImages} roomName="Suite Deluxe" />
    );

    const images = container.querySelectorAll('[data-testid="gallery-image"]');
    expect(images.length).toBeGreaterThan(0);

    // Simulate an error on the second image
    fireEvent.error(images[1]);

    await waitFor(() => {
      const errorFallbacks = container.querySelectorAll('[data-testid="error-fallback"]');
      expect(errorFallbacks.length).toBeGreaterThan(0);
    });
  });

  it('keeps the gallery layout intact when one image errors', async () => {
    const { container } = render(
      <RoomGalleryGrid images={mockImages} roomName="Suite Deluxe" />
    );

    const images = container.querySelectorAll('[data-testid="gallery-image"]');
    fireEvent.error(images[1]);

    await waitFor(() => {
      const grid = container.querySelector('.grid');
      expect(grid).toBeTruthy();
    });
  });
});

describe('RoomGalleryGrid - Mobile Carousel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a mobile carousel counter with current and total photo count', async () => {
    const { container } = render(
      <RoomGalleryGrid images={mockImages} roomName="Suite Deluxe" />
    );

    await waitFor(() => {
      const counter = container.querySelector('[data-testid="photo-counter"]');
      expect(counter).toBeTruthy();
      expect(counter?.textContent).toContain('Foto 1 de 6');
    });
  });

  it('updates the counter when navigating carousel slides', async () => {
    const { container } = render(
      <RoomGalleryGrid images={mockImages} roomName="Suite Deluxe" />
    );

    const nextButton = container.querySelector('[data-testid="carousel-next"]');
    expect(nextButton).toBeTruthy();

    fireEvent.click(nextButton!);

    await waitFor(() => {
      const counter = container.querySelector('[data-testid="photo-counter"]');
      expect(counter?.textContent).toContain('Foto 2 de 6');
    });
  });

  it('supports touch swipe navigation', async () => {
    const { container } = render(
      <RoomGalleryGrid images={mockImages} roomName="Suite Deluxe" />
    );

    const carousel = container.querySelector('[data-testid="mobile-carousel"]');
    expect(carousel).toBeTruthy();

    fireEvent.touchStart(carousel!, { touches: [{ clientX: 200 }] });
    fireEvent.touchMove(carousel!, { touches: [{ clientX: 50 }] });
    fireEvent.touchEnd(carousel!, { changedTouches: [{ clientX: 50 }] });

    await waitFor(() => {
      const counter = container.querySelector('[data-testid="photo-counter"]');
      expect(counter?.textContent).toContain('Foto 2 de 6');
    });
  });

  it('renders dots indicators matching the total photo count', async () => {
    const { container } = render(
      <RoomGalleryGrid images={mockImages} roomName="Suite Deluxe" />
    );

    await waitFor(() => {
      const dots = container.querySelectorAll('[data-testid="carousel-dot"]');
      expect(dots.length).toBe(6);
    });
  });
});

describe('RoomGalleryGrid - Detail page LCP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies hero LCP props in detail-page layout', async () => {
    const { container } = render(
      <RoomGalleryGrid images={mockImages} roomName="Suite Deluxe" layout="detail-page" />
    );

    await waitFor(() => {
      const desktop = container.querySelector('.hidden.lg\\:block');
      expect(desktop).toBeTruthy();
      const images = desktop!.querySelectorAll('[data-testid="gallery-image"]');
      expect(images.length).toBeGreaterThanOrEqual(4);

      const hero = images[0];
      expect(hero.getAttribute('sizes')).toBe('(max-width: 1024px) 100vw, 55vw');
      expect(hero.getAttribute('loading')).toBe('eager');
      expect(hero.getAttribute('data-priority')).toBe('true');
    });
  });

  it('applies high fetch priority to images 1-3 in detail-page layout', async () => {
    const { container } = render(
      <RoomGalleryGrid images={mockImages} roomName="Suite Deluxe" layout="detail-page" />
    );

    await waitFor(() => {
      const desktop = container.querySelector('.hidden.lg\\:block');
      const images = desktop!.querySelectorAll('[data-testid="gallery-image"]');
      expect(images.length).toBeGreaterThanOrEqual(4);

      for (let i = 1; i <= 3; i++) {
        const img = images[i];
        expect(img.getAttribute('sizes')).toBe('(max-width: 1024px) 100vw, 27vw');
        expect(img.getAttribute('loading')).toBe('lazy');
        expect(img.getAttribute('data-fetchpriority')).toBe('high');
      }
    });
  });

  it('preserves hotel-page default sizes when no layout is provided', async () => {
    const { container } = render(
      <RoomGalleryGrid images={mockImages} roomName="Suite Deluxe" />
    );

    await waitFor(() => {
      const desktop = container.querySelector('.hidden.lg\\:block');
      const images = desktop!.querySelectorAll('[data-testid="gallery-image"]');
      expect(images.length).toBeGreaterThanOrEqual(4);

      expect(images[0].getAttribute('sizes')).toBe('50vw');
      expect(images[1].getAttribute('sizes')).toBe('25vw');
      expect(images[1].getAttribute('data-fetchpriority')).toBeFalsy();
    });
  });
});
