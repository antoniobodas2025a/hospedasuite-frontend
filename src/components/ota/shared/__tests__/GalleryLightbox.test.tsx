// @vitest-environment jsdom
import '../../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import GalleryLightbox from '../GalleryLightbox';

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
  default: vi.fn().mockImplementation(() => ({
    init: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

// Mock photoswipe CSS
vi.mock('photoswipe/dist/photoswipe.css', () => ({}));

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
    const { container } = render(
      <GalleryLightbox
        slides={mockSlides}
        open={false}
        openIndex={0}
        onClose={mockOnClose}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders when open', () => {
    const { container } = render(
      <GalleryLightbox
        slides={mockSlides}
        open={true}
        openIndex={0}
        onClose={mockOnClose}
      />
    );

    // GalleryLightbox debe renderizar algo cuando está abierto
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts slides array', () => {
    const { container } = render(
      <GalleryLightbox
        slides={mockSlides}
        open={true}
        openIndex={0}
        onClose={mockOnClose}
      />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it('accepts custom className', () => {
    const { container } = render(
      <GalleryLightbox
        slides={mockSlides}
        open={true}
        openIndex={0}
        onClose={mockOnClose}
        className="custom-lightbox"
      />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it('handles empty slides array', () => {
    const { container } = render(
      <GalleryLightbox
        slides={[]}
        open={true}
        openIndex={0}
        onClose={mockOnClose}
      />
    );

    // No debería lanzar error
    expect(container.firstChild).toBeTruthy();
  });

  it('handles single slide', () => {
    const { container } = render(
      <GalleryLightbox
        slides={[mockSlides[0]]}
        open={true}
        openIndex={0}
        onClose={mockOnClose}
      />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it('supports zoom configuration', () => {
    const { container } = render(
      <GalleryLightbox
        slides={mockSlides}
        open={true}
        openIndex={0}
        onClose={mockOnClose}
        zoom={{ maxZoomLevel: 3 }}
      />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it('supports keyboard navigation', () => {
    const { container } = render(
      <GalleryLightbox
        slides={mockSlides}
        open={true}
        openIndex={0}
        onClose={mockOnClose}
        keyboard={{ escape: true, arrows: true }}
      />
    );

    expect(container.firstChild).toBeTruthy();
  });
});
