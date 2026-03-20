import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Asegúrate de importar tus estilos globales aquí

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HospedaSuite',
  description: 'Plataforma de Gestión Hotelera',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 👇 ESTAS SON LAS ETIQUETAS QUE TE FALTAN
    <html lang='es'>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
