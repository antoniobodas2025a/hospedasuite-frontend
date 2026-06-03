import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Geist } from 'next/font/google';
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
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
