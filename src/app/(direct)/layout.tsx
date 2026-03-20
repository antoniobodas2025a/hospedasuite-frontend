import React from 'react';
import type { Metadata } from 'next';
import { Inter, Calistoga } from 'next/font/google';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const calistoga = Calistoga({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-calistoga',
});

export const metadata: Metadata = {
  title: 'Motor de Reservas Seguro',
  robots: {
    index: false,
    follow: true,
  },
};

export default function DirectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Reemplazamos html/body por un div contenedor con flex-col
    <div className={`${inter.variable} ${calistoga.variable} font-sans bg-white min-h-screen flex flex-col`}>
      {children}
      {/* Footer Minimalista (Solución de Identidad) */}
      <div className='py-6 text-center border-t border-slate-100 mt-auto'>
        <p className='text-[10px] text-slate-400 font-medium uppercase tracking-widest'>
          Powered by{' '}
          <span className='font-bold text-slate-600'>HospedaSuite Tech</span>
        </p>
      </div>
    </div>
  );
}