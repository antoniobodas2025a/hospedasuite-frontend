import type { CategorizedImage, ImageCategory } from '@/types';

/**
 * Converts legacy flat gallery_urls[] to CategorizedImage[] format.
 * All legacy images are assigned category 'otros' with sequential sort_order.
 */
export function legacyGalleryToCategorized(galleryUrls: string[]): CategorizedImage[] {
  return galleryUrls
    .filter((url) => url && url.trim() !== '')
    .map((url, index) => ({
      url,
      category: 'otros' as ImageCategory,
      sort_order: index,
    }));
}
