// @vitest-environment jsdom
import '../../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import GalleryImage from '../GalleryImage';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, fill, style, onError, onLoad, ...props }: any) => {
    const img = (
      <img
        src={src}
        alt={alt}
        style={style}
        data-testid="next-image"
        onError={onError}
        onLoad={onLoad}
        {...props}
      />
    );
    return img;
  },
}));

describe('GalleryImage', () => {
  it('renders image with correct src and alt', () => {
    const { container } = render(
      <GalleryImage
        src="/test.jpg"
        alt="Test image"
        width={400}
        height={300}
      />
    );

    const img = container.querySelector('[data-testid="next-image"]');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('/test.jpg');
    expect(img?.getAttribute('alt')).toBe('Test image');
  });

  it('shows loading skeleton initially', () => {
    const { container } = render(
      <GalleryImage
        src="/test.jpg"
        alt="Test"
        width={400}
        height={300}
      />
    );

    // Skeleton debe estar presente antes de que la imagen cargue
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });

  it('hides skeleton after image loads', async () => {
    const { container } = render(
      <GalleryImage
        src="/test.jpg"
        alt="Test"
        width={400}
        height={300}
      />
    );

    // Simular carga de imagen
    const img = container.querySelector('[data-testid="next-image"]');
    img?.dispatchEvent(new Event('load'));

    await waitFor(() => {
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeFalsy();
    });
  });

  it('shows error fallback when image fails to load', async () => {
    const { container } = render(
      <GalleryImage
        src="/invalid.jpg"
        alt="Test"
        width={400}
        height={300}
      />
    );

    // Simular error de carga
    const img = container.querySelector('[data-testid="next-image"]');
    img?.dispatchEvent(new Event('error'));

    await waitFor(() => {
      const errorFallback = container.querySelector('[data-testid="error-fallback"]');
      expect(errorFallback).toBeTruthy();
    });
  });

  it('supports blur placeholder', () => {
    const blurData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';
    const { container } = render(
      <GalleryImage
        src="/test.jpg"
        alt="Test"
        width={400}
        height={300}
        blurDataURL={blurData}
      />
    );

    const img = container.querySelector('[data-testid="next-image"]');
    expect(img?.getAttribute('data-blur')).toBe(blurData);
  });

  it('applies custom className', () => {
    const { container } = render(
      <GalleryImage
        src="/test.jpg"
        alt="Test"
        width={400}
        height={300}
        className="custom-class"
      />
    );

    const wrapper = container.firstChild;
    expect(wrapper?.className).toContain('custom-class');
  });

  it('handles onClick callback', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <GalleryImage
        src="/test.jpg"
        alt="Test"
        width={400}
        height={300}
        onClick={handleClick}
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    wrapper.click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with fill mode', () => {
    const { container } = render(
      <GalleryImage
        src="/test.jpg"
        alt="Test"
        fill
      />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toBeTruthy();
  });

  it('supports priority loading', () => {
    const { container } = render(
      <GalleryImage
        src="/test.jpg"
        alt="Test"
        width={400}
        height={300}
        priority
      />
    );

    const img = container.querySelector('[data-testid="next-image"]');
    expect(img?.getAttribute('loading')).toBe('eager');
  });
});
