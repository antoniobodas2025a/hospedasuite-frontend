/**
 * Legacy Gallery Adapter — Unit Tests
 *
 * T9: Converts flat gallery_urls[] to CategorizedImage[] format
 * Pattern: mutation mindset — removing category assignment kills test
 */

import { describe, it, expect } from 'vitest';
import { legacyGalleryToCategorized } from '@/lib/adapters/legacy-gallery-adapter';
import type { CategorizedImage } from '@/types';

describe('T9: legacyGalleryToCategorized adapter', () => {
  it('converts flat URL array to CategorizedImage[] with default category', () => {
    const flatUrls = [
      'https://r2.dev/photo1.webp',
      'https://r2.dev/photo2.webp',
      'https://r2.dev/photo3.webp',
    ];

    const result = legacyGalleryToCategorized(flatUrls);

    expect(result).toHaveLength(3);
    expect(result[0].url).toBe('https://r2.dev/photo1.webp');
    expect(result[0].category).toBe('otros');
    expect(result[0].sort_order).toBe(0);
    expect(result[1].sort_order).toBe(1);
    expect(result[2].sort_order).toBe(2);
  });

  it('assigns category "otros" to every legacy image (no category metadata available)', () => {
    const flatUrls = ['https://r2.dev/a.webp', 'https://r2.dev/b.webp'];

    const result = legacyGalleryToCategorized(flatUrls);

    // Mutation mindset: EVERY image must have category 'otros'
    for (const img of result) {
      expect(img.category).toBe('otros');
    }
  });

  it('returns empty array for empty input', () => {
    const result = legacyGalleryToCategorized([]);

    expect(result).toEqual([]);
  });

  it('preserves URL order as sort_order', () => {
    const flatUrls = [
      'https://r2.dev/first.webp',
      'https://r2.dev/second.webp',
      'https://r2.dev/third.webp',
    ];

    const result = legacyGalleryToCategorized(flatUrls);

    expect(result[0].url).toBe('https://r2.dev/first.webp');
    expect(result[0].sort_order).toBe(0);
    expect(result[1].url).toBe('https://r2.dev/second.webp');
    expect(result[1].sort_order).toBe(1);
    expect(result[2].url).toBe('https://r2.dev/third.webp');
    expect(result[2].sort_order).toBe(2);
  });

  it('mutation mindset: result satisfies CategorizedImage interface (has url + category + sort_order)', () => {
    const flatUrls = ['https://r2.dev/photo.webp'];

    const result: CategorizedImage[] = legacyGalleryToCategorized(flatUrls);

    // This test kills compilation if the adapter returns wrong shape
    expect(result[0]).toHaveProperty('url');
    expect(result[0]).toHaveProperty('category');
    expect(result[0]).toHaveProperty('sort_order');
    expect(typeof result[0].url).toBe('string');
    expect(typeof result[0].category).toBe('string');
    expect(typeof result[0].sort_order).toBe('number');
  });

  it('mutation mindset: wrong default category fails', () => {
    const flatUrls = ['https://r2.dev/photo.webp'];

    const result = legacyGalleryToCategorized(flatUrls);

    // If someone changes default to 'exterior' instead of 'otros', this catches it
    expect(result[0].category).not.toBe('exterior');
    expect(result[0].category).not.toBe('lobby');
    expect(result[0].category).toBe('otros');
  });

  it('filters out empty/null/undefined URLs from input', () => {
    const flatUrls = [
      'https://r2.dev/valid.webp',
      '',
      'https://r2.dev/another.webp',
    ];

    const result = legacyGalleryToCategorized(flatUrls);

    expect(result).toHaveLength(2);
    expect(result[0].url).toBe('https://r2.dev/valid.webp');
    expect(result[1].url).toBe('https://r2.dev/another.webp');
  });
});
