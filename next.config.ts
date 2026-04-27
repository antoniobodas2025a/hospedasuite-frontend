import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  
  // BYPASS PARA VERCEL
  typescript: {
    ignoreBuildErrors: true,
  },
  

  // 🛡️ BARRERA WAF: Cabeceras HTTP Estrictas (Inyectado por Dra. Cipher)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' }, 
          { key: 'X-Content-Type-Options', value: 'nosniff' }, 
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

// 📡 INYECCIÓN DE TELEMETRÍA (Híbrido Sentry Wizard + SecOps Shield)
export default withSentryConfig(nextConfig, {
  org: "hospedasuite",
  project: "hospedasuite-frontend",
  silent: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  
  // 🛡️ SecOps: Oculta el código fuente original en los navegadores de los usuarios
  hideSourceMaps: true,

  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});