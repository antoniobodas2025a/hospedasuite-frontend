import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // AI search bots — explicit allow
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Claude-SearchBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      // General crawlers: allow everything except admin/dashboard/auth
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/software/onboarding',
          '/staff-login',
          '/api/',
          '/demo/',
        ],
      },
    ],
    sitemap: 'https://hospedasuite.com/sitemap.xml',
  };
}
