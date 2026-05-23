import React from 'react';
import type { Metadata } from 'next';
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
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default function DirectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // data-theme="ota" activates Tierra & Sal palette for direct booking channel
    <div data-theme="ota" className={`${calistoga.variable} font-sans bg-background text-foreground min-h-screen flex flex-col`}>
      {children}
      {/* Footer Minimalista */}
      <div className='py-6 text-center border-t border-border mt-auto'>
        <p className='text-[10px] text-muted-foreground font-medium uppercase tracking-widest'>
          Powered by{' '}
          <span className='font-bold text-foreground/60'>HospedaSuite Tech</span>
        </p>
      </div>
    </div>
  );
}
