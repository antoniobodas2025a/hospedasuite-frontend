'use client';

import React, { useState, useTransition, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface GalleryImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  blurDataURL?: string;
  preload?: boolean;
  onClick?: () => void;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  loading?: 'lazy' | 'eager';
  objectFit?: 'cover' | 'contain';
  /** Called when the image finishes loading successfully */
  onLoad?: () => void;
}

/**
 * GalleryImage - Primitiva compartida para componentes de galería
 * 
 * Maneja:
 * - Loading skeleton mientras carga la imagen
 * - Error fallback cuando la imagen falla
 * - Blur placeholders para transiciones suaves
 * - Click handlers para lightbox
 * 
 * Uso:
 * ```tsx
 * <GalleryImage
 *   src="/hotel.jpg"
 *   alt="Hotel exterior"
 *   width={400}
 *   height={300}
 *   blurDataURL="data:image/jpeg;base64,..."
 * />
 * ```
 */
export default function GalleryImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  blurDataURL,
  preload = false,
  onClick,
  sizes,
  quality = 75,
  placeholder,
  loading,
  objectFit = 'cover',
  onLoad: onLoadProp,
}: GalleryImageProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [, startTransition] = useTransition();

  // Use startTransition for non-urgent UI updates (loading state)
  // so they don't block user interactions
  const handleLoad = useCallback(() => {
    startTransition(() => setIsLoading(false));
    onLoadProp?.();
  }, [onLoadProp]);

  const handleError = useCallback(() => {
    startTransition(() => {
      setIsLoading(false);
      setHasError(true);
    });
  }, []);

  // Error fallback
  if (hasError) {
    return (
      <div
        data-testid="error-fallback"
        role="alert"
        aria-live="polite"
        className={cn(
          'relative bg-muted flex items-center justify-center',
          fill ? 'w-full h-full' : 'w-[400px] h-[300px]',
          className
        )}
      >
        <div className="text-center text-muted-foreground">
          <svg
            aria-hidden="true"
            className="w-12 h-12 mx-auto mb-2 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">{t('ota.heroGallery.errorLoading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        fill ? 'w-full h-full' : width && height ? '' : 'w-[400px] h-[300px]',
        onClick && 'cursor-pointer',
        className
      )}
      style={!fill && width && height ? { width: `${width}px`, height: `${height}px` } : undefined}
      onClick={onClick}
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 bg-muted motion-safe:animate-pulse motion-safe:duration-700',
            fill ? 'w-full h-full' : 'w-full h-full'
          )}
        />
      )}

      {/* Image */}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        className={cn(
          'motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out',
          isLoading ? 'opacity-0' : 'opacity-100',
          fill && objectFit === 'cover' && 'object-cover',
          fill && objectFit === 'contain' && 'object-contain'
        )}
        sizes={sizes}
        quality={quality}
        preload={preload}
        loading={loading || (preload ? 'eager' : 'lazy')}
        placeholder={placeholder || (blurDataURL ? 'blur' : undefined)}
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        data-blur={blurDataURL}
      />
    </div>
  );
}
