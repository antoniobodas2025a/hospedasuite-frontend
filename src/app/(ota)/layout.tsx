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
  title: 'HospedaSuite | Find your perfect escape',
  description: 'Book the best hotels with no hidden fees.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function OTALayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="ota" className={`${calistoga.variable} font-sans bg-background text-foreground min-h-screen`}>
      <AttributionTracker />
      {children}
    </div>
  );
}
