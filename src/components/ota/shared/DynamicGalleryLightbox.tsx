import dynamic from 'next/dynamic';

// Lazy load GalleryLightbox to avoid loading PhotoSwipe CSS until needed
export const DynamicGalleryLightbox = dynamic(
  () => import('./GalleryLightbox'),
  {
    ssr: false, // PhotoSwipe doesn't work with SSR
    loading: () => null, // Don't show anything while loading
  }
);
