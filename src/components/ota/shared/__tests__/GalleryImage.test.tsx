// @vitest-environment jsdom
import '../../../../__tests__/bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import GalleryImage from '@/components/ota/shared/GalleryImage';

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ priority, loading, alt, src }: { priority?: boolean; loading?: 'eager' | 'lazy'; alt: string; src: string }) => (
    <img src={src} alt={alt} data-priority={priority ? 'true' : undefined} data-loading={loading} />
  ),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('GalleryImage', () => {
  it('marks the image as priority and eager when preload is true', () => {
    const { container } = render(
      <GalleryImage src="https://example.com/hero.jpg" alt="Hero" preload fill />
    );

    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('data-priority')).toBe('true');
    expect(img?.getAttribute('data-loading')).toBe('eager');
  });

  it('does not mark the image as priority and defaults to lazy when preload is false', () => {
    const { container } = render(
      <GalleryImage src="https://example.com/thumb.jpg" alt="Thumbnail" fill />
    );

    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('data-priority')).toBeNull();
    expect(img?.getAttribute('data-loading')).toBe('lazy');
  });
});
