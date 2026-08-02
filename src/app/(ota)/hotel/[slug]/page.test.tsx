// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(() => async (key: string) => key),
}));

vi.mock('@/app/actions/ota', () => ({
  getHotelDetailsBySlugAction: vi.fn(() =>
    Promise.resolve({
      success: true,
      hotel: {
        id: 'hotel-1',
        name: 'Hotel Test',
        slug: 'hotel-test',
        main_image_url: 'https://example.com/hero.jpg',
        seo_og_image_url: 'https://example.com/og-hero.jpg',
        location: 'Bogotá',
      },
    })
  ),
  getReviewStatsAction: vi.fn(() => Promise.resolve({ success: false })),
}));

describe('hotel page metadata', () => {
  it('preloads the hero image in metadata', async () => {
    const { generateMetadata } = await import('./page');
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'hotel-test' }),
      searchParams: Promise.resolve({}),
    });

    const links = Array.isArray(metadata.other?.link)
      ? metadata.other?.link
      : [metadata.other?.link].filter(Boolean);

    const preloadLink = links?.find(
      (link) =>
        typeof link === 'string' &&
        link.includes('rel=preload') &&
        link.includes('as=image')
    );

    expect(preloadLink).toBeTruthy();
    expect(preloadLink).toContain('https://example.com/og-hero.jpg');
    expect(preloadLink).toContain('fetchpriority=high');
  });
});
