/**
 * Feature Flags — HospedaSuite
 *
 * Feature flags for gradual rollout and experimentation.
 * Uses @vercel/flags for runtime configuration without deploys.
 */

import { flag } from '@vercel/flags/next';

/**
 * Categorized Gallery — Gradual rollout of category-grouped image display
 *
 * When enabled: Uses CategorizedHeroGallery (groups images by category)
 * When disabled: Uses legacy HeroGallery (flat image list)
 *
 * Default: false (legacy gallery)
 */
export const categorizedGalleryFlag = flag<boolean>({
  key: 'categorized-gallery',
  defaultValue: false,
  options: [
    { value: true, label: 'Categorized gallery (grouped by category)' },
    { value: false, label: 'Legacy gallery (flat list)' },
  ],
  description: 'Gradual rollout of categorized image gallery (exterior → lobby → habitaciones → ...)',
  decide: () => false, // Default to legacy; enable per-hotel or globally via Vercel dashboard
});
