import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
	// 📸 CONFIGURACIÓN DE MOTOR DE IMÁGENES (SUPABASE + CDN)
	images: {
		formats: ["image/avif", "image/webp"] as ["image/avif", "image/webp"], // AVIF primero, fallback WebP
		minimumCacheTTL: 31536000, // 1 año — imágenes no cambian
		qualities: [75, 85, 90], // 75 default, 85 for hero/cover, 90 for room galleries
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "auaqpomuivfhomlkvhju.supabase.co",
				port: "",
				pathname: "/storage/v1/**",
			},
			{
				protocol: "https",
				hostname: "images.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "pub-75809b4a12c441b891f9b5a2316c2cc2.r2.dev",
				port: "",
				pathname: "/**",
			},
		],
	},

	// 🛡️ CONFIGURACIÓN DE COMPILACIÓN
	// TS ahora tiene 0 errores — este bloque se mantiene vacío pero disponible
	// si en el futuro se necesita configurar type checking del build.

	// 🛡️ BARRERA WAF: Cabeceras HTTP Estrictas (Security-First)
	async headers() {
		const appUrl =
			process.env.NEXT_PUBLIC_APP_URL || "https://hospedasuite.com";
		const wompiDomain = "https://checkout.wompi.co";
		const r2Domain = "https://pub-75809b4a12c441b891f9b5a2316c2cc2.r2.dev";
		const r2UploadDomain = "https://*.r2.cloudflarestorage.com";
		const supabaseDomain = "https://auaqpomuivfhomlkvhju.supabase.co";
		const sentryDomain = "https://*.ingest.sentry.io";
		const posthogDomain = "https://us.i.posthog.com";
		const posthogAssetsDomain = "https://us-assets.i.posthog.com";
		const googleAnalyticsDomain = "https://www.google.com";
		const googleAnalyticsApiDomain = "https://www.google-analytics.com";
		const nominatimDomain = "https://nominatim.openstreetmap.org";

		return [
			{
				source: "/(.*)",
				headers: [
					{ key: "X-DNS-Prefetch-Control", value: "on" },
					{
						key: "Strict-Transport-Security",
						value: "max-age=63072000; includeSubDomains; preload",
					},
					{ key: "X-Frame-Options", value: "SAMEORIGIN" },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{
						key: "Content-Security-Policy",
						value: [
							`default-src 'self'`,
							`script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com ${wompiDomain} ${sentryDomain} https://cdn.jsdelivr.net ${posthogDomain} ${posthogAssetsDomain} ${googleAnalyticsDomain}`,
							`style-src 'self' 'unsafe-inline' https://unpkg.com`,
							`img-src 'self' blob: data: ${r2Domain} ${supabaseDomain} https://images.unsplash.com https://*.tile.openstreetmap.org`,
							`font-src 'self' data:`,
							`connect-src 'self' ${r2UploadDomain} ${wompiDomain} ${supabaseDomain} ${sentryDomain} ${appUrl} https://*.tile.openstreetmap.org ${posthogDomain} ${posthogAssetsDomain} ${googleAnalyticsDomain} ${googleAnalyticsApiDomain} ${nominatimDomain}`,
							`worker-src 'self' blob:`,
							`media-src 'self' blob:`,
							`object-src 'none'`,
							`frame-src ${wompiDomain} https://www.google.com https://maps.google.com`,
							`frame-ancestors 'self'`,
							`base-uri 'self'`,
							`form-action 'self' ${wompiDomain}`,
						].join("; "),
					},
					{
						key: "Permissions-Policy",
						value: [
							"camera=()",
							"microphone=()",
							"geolocation=()",
							'payment=(self "https://checkout.wompi.co")',
						].join(", "),
					},
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
export default withSentryConfig(
	withNextIntl(nextConfig as import("next").NextConfig),
	sentryOptions,
);
