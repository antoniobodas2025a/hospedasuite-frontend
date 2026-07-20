// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, afterEach, mock, beforeEach } from 'bun:test';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import type { CategorizedImage } from '@/types';

// Mock next-intl before importing the component
mock.module('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/image (uses Next.js optimization not available in test env)
mock.module('next/image', () => ({
  default: (props: any) => {
    const { fill, priority, placeholder, blurDataURL, sizes, quality, ...rest } = props;
    return React.createElement('img', rest);
  },
}));

// Mock useIsMobile hook
mock.module('@/hooks/useIsMediaQuery', () => ({
  useIsMobile: () => false,
}));

// Import after mocking
import CategorizedHeroGallery from '../CategorizedHeroGallery';

describe('T7: CategorizedHeroGallery — Category grouping', () => {
  afterEach(() => {
    cleanup();
  });

  const mockImages: CategorizedImage[] = [
    { url: 'https://r2.dev/exterior1.webp', category: 'exterior', sort_order: 0 },
    { url: 'https://r2.dev/exterior2.webp', category: 'exterior', sort_order: 1 },
    { url: 'https://r2.dev/lobby1.webp', category: 'lobby', sort_order: 0 },
    { url: 'https://r2.dev/room1.webp', category: 'habitacion', sort_order: 0 },
    { url: 'https://r2.dev/room2.webp', category: 'habitacion', sort_order: 1 },
    { url: 'https://r2.dev/pool1.webp', category: 'amenidades', sort_order: 0 },
  ];

  it('renders images grouped by category', () => {
    const { container } = render(
      <CategorizedHeroGallery images={mockImages} hotelName="Hotel Test" />
    );

    // Should have category group sections
    const headings = container.querySelectorAll('h3, [role="heading"]');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('displays category labels in Spanish', () => {
    const { getByText } = render(
      <CategorizedHeroGallery images={mockImages} hotelName="Hotel Test" />
    );

    // CATEGORY_DISPLAY_ES labels
    expect(getByText('Exteriores')).toBeDefined();
    expect(getByText('Lobby / Recepción')).toBeDefined();
    expect(getByText('Habitaciones')).toBeDefined();
    expect(getByText('Amenidades')).toBeDefined();
  });

  it('renders groups in priority order: exterior → lobby → habitacion → amenidades', () => {
    const { container } = render(
      <CategorizedHeroGallery images={mockImages} hotelName="Hotel Test" />
    );

    const headings = container.querySelectorAll('h3, [role="heading"]');
    const labels = Array.from(headings).map(h => h.textContent);

    // Priority order must be: Exteriores → Lobby → Habitaciones → Amenidades
    const exteriorIdx = labels.indexOf('Exteriores');
    const lobbyIdx = labels.indexOf('Lobby / Recepción');
    const roomIdx = labels.indexOf('Habitaciones');
    const amenIdx = labels.indexOf('Amenidades');

    expect(exteriorIdx).toBeLessThan(lobbyIdx);
    expect(lobbyIdx).toBeLessThan(roomIdx);
    expect(roomIdx).toBeLessThan(amenIdx);
  });

  it('mutation mindset: wrong priority order fails', () => {
    const { container } = render(
      <CategorizedHeroGallery images={mockImages} hotelName="Hotel Test" />
    );

    const headings = container.querySelectorAll('h3, [role="heading"]');
    const labels = Array.from(headings).map(h => h.textContent);

    // Exterior MUST be first (not lobby, not amenidades)
    expect(labels[0]).toBe('Exteriores');
    // If someone reorders priority, this catches it
    expect(labels[0]).not.toBe('Lobby / Recepción');
    expect(labels[0]).not.toBe('Otros');
  });

  it('renders nothing when images array is empty', () => {
    const { container } = render(
      <CategorizedHeroGallery images={[]} hotelName="Hotel Test" />
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders all images within their category groups', () => {
    const { container } = render(
      <CategorizedHeroGallery images={mockImages} hotelName="Hotel Test" />
    );

    // Total images rendered should match input count
    const images = container.querySelectorAll('img');
    expect(images.length).toBe(mockImages.length);
  });

  it('does not contain jargon (OTA, Marketplace, Vitrina Digital)', () => {
    const { container } = render(
      <CategorizedHeroGallery images={mockImages} hotelName="Hotel Test" />
    );

    const text = container.textContent || '';
    expect(text.toLowerCase()).not.toContain('ota');
    expect(text.toLowerCase()).not.toContain('marketplace');
    expect(text.toLowerCase()).not.toContain('vitrina digital');
  });
});

describe('T8: CategorizedHeroGallery — Responsive / aspect-ratio', () => {
  afterEach(() => {
    cleanup();
  });

  const mockImages: CategorizedImage[] = [
    { url: 'https://r2.dev/ext1.webp', category: 'exterior', sort_order: 0 },
    { url: 'https://r2.dev/room1.webp', category: 'habitacion', sort_order: 0 },
  ];

  it('uses aspect-ratio to prevent image cropping', () => {
    const { container } = render(
      <CategorizedHeroGallery images={mockImages} hotelName="Hotel Test" />
    );

    // Images should be in containers with aspect-ratio classes (no fixed height crop)
    const imageContainers = container.querySelectorAll('[class*="aspect-"]');
    expect(imageContainers.length).toBeGreaterThan(0);
  });

  it('renders responsive grid layout classes', () => {
    const { container } = render(
      <CategorizedHeroGallery images={mockImages} hotelName="Hotel Test" />
    );

    // Should have responsive grid classes (grid + breakpoints)
    const grids = container.querySelectorAll('[class*="grid"]');
    expect(grids.length).toBeGreaterThan(0);
  });

  it('mutation mindset: images use object-contain or aspect-ratio (not object-cover crop)', () => {
    const { container } = render(
      <CategorizedHeroGallery images={mockImages} hotelName="Hotel Test" />
    );

    // The gallery should NOT crop images — it should preserve aspect ratio
    // Check that at least some containers have aspect-ratio or object-contain
    const html = container.innerHTML;
    const hasAspectPreservation = html.includes('aspect-') || html.includes('object-contain');
    expect(hasAspectPreservation).toBe(true);
  });
});
