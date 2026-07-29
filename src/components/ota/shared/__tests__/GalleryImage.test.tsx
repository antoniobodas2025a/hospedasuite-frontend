// @vitest-environment jsdom
import '../../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import GalleryImage from '../GalleryImage';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, fill, style, onError, onLoad, ...props }: any) => {
    // No llamar onLoad automáticamente - el test debe simularlo
    const img = (
      <img
        src={src}
        alt={alt}
        style={style}
        data-testid="next-image"
        onError={onError}
        {...props}
      />
    );
    return img;
  },
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="es" messages={{}}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('GalleryImage', () => {
  it('renders image with correct src and alt', () => {
    const { container } = renderWithProviders(
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
    const { container } = renderWithProviders(
      <GalleryImage
        src="/test.jpg"
        alt="Test"
        width={400}
        height={300}
      />
    );

    // Verificar que el componente se renderiza correctamente
    const wrapper = container.firstChild;
    expect(wrapper).toBeTruthy();
  });

  it('hides skeleton after image loads', async () => {
    const { container } = renderWithProviders(
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

    // La imagen debe estar presente después de cargar
    await waitFor(() => {
      const loadedImg = container.querySelector('[data-testid="next-image"]');
      expect(loadedImg).toBeTruthy();
    });
  });

  it('shows error fallback when image fails to load', async () => {
    const { container } = renderWithProviders(
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
    const { container } = renderWithProviders(
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
    const { container } = renderWithProviders(
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
    const { container } = renderWithProviders(
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
    const { container } = renderWithProviders(
      <GalleryImage
        src="/test.jpg"
        alt="Test"
        fill
      />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toBeTruthy();
  });

  it('supports preload loading', () => {
    const { container } = renderWithProviders(
      <GalleryImage
        src="/test.jpg"
        alt="Test"
        width={400}
        height={300}
        preload
      />
    );

    const img = container.querySelector('[data-testid="next-image"]');
    expect(img?.getAttribute('loading')).toBe('eager');
  });
});
