import React from 'react';
import type { Metadata } from 'next';
import AttributionTracker from '@/components/public/AttributionTracker';
import { Calistoga } from 'next/font/google';
import { getTranslations } from 'next-intl/server';
import '../globals.css';

const calistoga = Calistoga({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-calistoga',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return {
    title: t('title'),
    description: t('description'),
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function OTALayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="ota" className={`${calistoga.variable} font-sans bg-background text-foreground min-h-screen`}>
      <AttributionTracker />
      {children}
    </div>
  );
}
