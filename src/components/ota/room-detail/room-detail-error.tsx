'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { GlassPanel } from '@/components/ui/glass';
import { cn } from '@/lib/utils';
import type { RoomDetailViewModelOutput } from '@/view-models/room-detail-view-model';

interface RoomDetailErrorProps {
  output: RoomDetailViewModelOutput;
}

export function RoomDetailError({ output }: RoomDetailErrorProps) {
  const t = useTranslations();
  const message = output.error ?? t('ota.roomDetail.genericError');

  return (
    <div data-testid="room-detail-error" className="p-4 lg:p-6">
      <GlassPanel className="max-w-md mx-auto p-8 text-center">
        <div className="mx-auto mb-4 size-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle size={28} className="text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">
          {t('ota.roomDetail.errorTitle')}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <Link
          href={output.breadcrumb.href}
          className={cn(
            'inline-flex items-center justify-center px-6 py-3 rounded-[var(--radius-squircle-md)]',
            'bg-primary text-primary-foreground font-bold text-sm',
            'hover:bg-primary/90 transition-colors'
          )}
        >
          {t('ota.roomDetail.backToHotel')}
        </Link>
      </GlassPanel>
    </div>
  );
}
