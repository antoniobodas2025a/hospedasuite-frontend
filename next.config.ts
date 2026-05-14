import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 📸 CONFIGURACIÓN DE MOTOR DE IMÁGENES (SUPABASE + CDN)
  images: {
    formats: ['image/avif', 'image/webp'],  // AVIF primero, fallback WebP
    minimumCacheTTL: 31536000,              // 1 año — imágenes no cambian
    deviceSizes: [320, 480, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'auaqpomuivfhomlkvhju.supabase.co',
        port: '',
        pathname: '/storage/v1/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  
  // 🛡️ CONFIGURACIÓN DE COMPILACIÓN
  // TS ahora tiene 0 errores — este bloque se mantiene vacío pero disponible
  // si en el futuro se necesita configurar type checking del build.

  // 🛡️ BARRERA WAF: Cabeceras HTTP Estrictas (Security-First)
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

// 📡 INYECCIÓN DE TELEMETRÍA (Sentry Wizard + SecOps Shield)
const sentryOptions = {
  org: "hospedasuite",
  project: "hospedasuite-frontend",
  silent: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true, // Protección de propiedad intelectual (Capa 7)
};

// EXPORTACIÓN DETERMINISTA
export default withSentryConfig(nextConfig, sentryOptions);