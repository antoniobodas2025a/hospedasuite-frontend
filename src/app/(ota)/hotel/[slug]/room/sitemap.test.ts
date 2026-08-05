// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/app/actions/room-detail', () => ({
  getRoomSitemapEntriesAction: vi.fn(),
}));

import { getRoomSitemapEntriesAction } from '@/app/actions/room-detail';

describe('room detail sitemap', () => {
  it('returns sitemap ids based on entry count', async () => {
    (getRoomSitemapEntriesAction as any).mockResolvedValue(
      Array.from({ length: 250 }, (_, i) => ({
        slug: `hotel-${i}`,
        id: `room-${i}`,
        updatedAt: '2026-08-05',
      }))
    );

    const { generateSitemaps } = await import('./sitemap');
    const sitemaps = await generateSitemaps();

    expect(sitemaps).toHaveLength(3);
    expect(sitemaps[0]).toEqual({ id: 0 });
    expect(sitemaps[2]).toEqual({ id: 2 });
  });

  it('returns mapped room detail URLs for a given sitemap id', async () => {
    (getRoomSitemapEntriesAction as any).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        slug: `hotel-${i}`,
        id: `room-${i}`,
        updatedAt: `2026-08-0${i + 1}`,
      }))
    );

    const { default: sitemap } = await import('./sitemap');
    const entries = await sitemap({ id: Promise.resolve('0') });

    expect(entries).toHaveLength(5);
    expect(entries[0]).toEqual({
      url: 'https://hospedasuite.com/hotel/hotel-0/room/room-0',
      lastModified: new Date('2026-08-01'),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  });

  it('returns an empty sitemap when there are no rooms', async () => {
    (getRoomSitemapEntriesAction as any).mockResolvedValue([]);

    const { generateSitemaps, default: sitemap } = await import('./sitemap');
    const sitemaps = await generateSitemaps();
    expect(sitemaps).toEqual([{ id: 0 }]);

    const entries = await sitemap({ id: Promise.resolve('0') });
    expect(entries).toEqual([]);
  });
});
