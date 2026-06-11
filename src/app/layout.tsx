import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Geist } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { cn } from "@/lib/utils";

// Geist Variable: una sola fuente para todo el sistema (zero layout shift)
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

// 🛡️ CONTRATO DE VIEWPORT ESTRICTO (MOBILE FIRST ZERO-TRUST)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // 🚨 CRÍTICO: Bloquea el auto-zoom destructivo de Safari en inputs < 16px
  userScalable: false, // Emula el comportamiento de una App Nativa (iOS/Android)
  viewportFit: 'cover', // Asegura que el color de fondo pase por debajo del Dynamic Island/Notch
};

// Dynamic Metadata per locale
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return {
    title: t('title'),
    description: t('description'),
    icons: {
      icon: '/favicon.ico',
      apple: '/logo.png',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://auaqpomuivfhomlkvhju.supabase.co" />
        <link rel="preconnect" href="https://pub-75809b4a12c441b891f9b5a2316c2cc2.r2.dev" />
      </head>
      <body className={geist.className}>
        {/* Gap D: Dark Funnel Analytics - GTM Container */}
        <Script
          id="gtm-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-W3VSWFMZ');`,
          }}
        />
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-W3VSWFMZ"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
