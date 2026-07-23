'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface GalleryImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  blurDataURL?: string;
  priority?: boolean;
  onClick?: () => void;
  sizes?: string;
  quality?: number;
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
  priority = false,
  onClick,
  sizes,
  quality = 75,
}: GalleryImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Error fallback
  if (hasError) {
    return (
      <div
        data-testid="error-fallback"
        className={cn(
          'relative bg-muted flex items-center justify-center',
          fill ? 'w-full h-full' : 'w-[400px] h-[300px]',
          className
        )}
      >
        <div className="text-center text-muted-foreground">
          <svg
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
          <p className="text-sm">Error al cargar imagen</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        fill ? 'w-full h-full' : width && height ? `w-[${width}px] h-[${height}px]` : 'w-[400px] h-[300px]',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 bg-muted animate-pulse',
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
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          fill && 'object-cover'
        )}
        sizes={sizes}
        quality={quality}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        placeholder={blurDataURL ? 'blur' : undefined}
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        data-blur={blurDataURL}
      />
    </div>
  );
}
