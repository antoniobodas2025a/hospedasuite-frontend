import type { Metadata, Viewport } from 'next';
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' }, // slate-50 (Frosted Pearl)
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },  // zinc-950 (Deep Glass B2B)
  ],
  viewportFit: 'cover', // Asegura que el color de fondo pase por debajo del Dynamic Island/Notch
};

// Contrato de Metadatos Base
export const metadata: Metadata = {
  title: 'HospedaSuite',
  description: 'Plataforma de Gestión Hotelera y Motor de Reservas de Vanguardia',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 🛡️ suppressHydrationWarning añadido preventivamente para extensiones o Theme Providers
    <html lang='es' className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className={geist.className}>
        {children}
      </body>
    </html>
  );
}