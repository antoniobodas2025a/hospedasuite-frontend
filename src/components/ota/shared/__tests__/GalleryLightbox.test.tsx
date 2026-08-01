// @vitest-environment jsdom
import '../../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import GalleryLightbox from '../GalleryLightbox';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock photoswipe
vi.mock('photoswipe', () => ({
  default: vi.fn().mockImplementation(() => ({
    init: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

// Mock photoswipe/lightbox
vi.mock('photoswipe/lightbox', () => ({
  default: class MockPhotoSwipeLightbox {
    init = vi.fn();
    destroy = vi.fn();
    on = vi.fn();
    off = vi.fn();
    loadAndOpen = vi.fn();
    pswp = null;
  },
}));

// Mock photoswipe CSS
vi.mock('photoswipe/dist/photoswipe.css', () => ({}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="es" messages={{}}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('GalleryLightbox', () => {
  const mockSlides = [
    { src: '/test1.jpg', alt: 'Test 1', width: 800, height: 600 },
    { src: '/test2.jpg', alt: 'Test 2', width: 800, height: 600 },
  ];

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <GalleryLightbox
        slides={mockSlides}
        open={false}
        openIndex={0}
        onClose={mockOnClose}
      />
    );

    // GalleryLightbox returns null (PhotoSwipe renders to document.body)
    expect(container.firstChild).toBeNull();
  });

  it('does not throw when open', () => {
    // GalleryLightbox returns null but initializes PhotoSwipe in useEffect
    expect(() => {
      renderWithProviders(
        <GalleryLightbox
          slides={mockSlides}
          open={true}
          openIndex={0}
          onClose={mockOnClose}
        />
      );
    }).not.toThrow();
  });

  it('accepts slides array without error', () => {
    expect(() => {
      renderWithProviders(
        <GalleryLightbox
          slides={mockSlides}
          open={true}
          openIndex={0}
          onClose={mockOnClose}
        />
      );
    }).not.toThrow();
  });

  it('accepts custom className without error', () => {
    expect(() => {
      renderWithProviders(
        <GalleryLightbox
          slides={mockSlides}
          open={true}
          openIndex={0}
          onClose={mockOnClose}
          className="custom-lightbox"
        />
      );
    }).not.toThrow();
  });

  it('handles empty slides array without error', () => {
    expect(() => {
      renderWithProviders(
        <GalleryLightbox
          slides={[]}
          open={true}
          openIndex={0}
          onClose={mockOnClose}
        />
      );
    }).not.toThrow();
  });

  it('handles single slide without error', () => {
    expect(() => {
      renderWithProviders(
        <GalleryLightbox
          slides={[mockSlides[0]]}
          open={true}
          openIndex={0}
          onClose={mockOnClose}
        />
      );
    }).not.toThrow();
  });

  it('supports zoom configuration without error', () => {
    expect(() => {
      renderWithProviders(
        <GalleryLightbox
          slides={mockSlides}
          open={true}
          openIndex={0}
          onClose={mockOnClose}
          zoom={{ maxZoomLevel: 3 }}
        />
      );
    }).not.toThrow();
  });

  it('supports keyboard navigation without error', () => {
    expect(() => {
      renderWithProviders(
        <GalleryLightbox
          slides={mockSlides}
          open={true}
          openIndex={0}
          onClose={mockOnClose}
          keyboard={{ escape: true, arrows: true }}
        />
      );
    }).not.toThrow();
  });
});
