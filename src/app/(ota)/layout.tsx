import React from 'react';
import type { Metadata } from 'next';
import AttributionTracker from '@/components/public/AttributionTracker';
import { Calistoga } from 'next/font/google';
import '../globals.css';

const calistoga = Calistoga({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-calistoga',
});

export const metadata: Metadata = {
  title: 'HospedaSuite | Encuentra tu escape perfecto',
  description: 'Reserva los mejores hoteles sin comisiones ocultas.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function OTALayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme="ota" activates Tierra & Sal palette via CSS cascade
    <div data-theme="ota" className={`${calistoga.variable} font-sans bg-background text-foreground min-h-screen`}>
      <AttributionTracker />
      {children}
    </div>
  );
}