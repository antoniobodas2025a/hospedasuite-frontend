// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl/server', () => ({
  getLocale: vi.fn(() => Promise.resolve('es')),
  getMessages: vi.fn(() => Promise.resolve({})),
  getTranslations: vi.fn(() => Promise.resolve((key: string) => key)),
}));

vi.mock('next/font/google', () => ({
  Geist: vi.fn(() => ({
    variable: '--font-sans',
    className: 'font-sans',
  })),
}));

describe('root layout metadata', () => {
  it('preconnects to font origin for faster Google Fonts loading', async () => {
    const { generateMetadata } = await import('@/app/layout');
    const metadata = await generateMetadata();

    const links = Array.isArray(metadata.other?.link)
      ? metadata.other?.link
      : [metadata.other?.link].filter(Boolean);

    expect(links).toEqual(
      expect.arrayContaining([
        '<https://fonts.gstatic.com>; rel=preconnect; crossorigin=anonymous',
      ])
    );
  });
});
