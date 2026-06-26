'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { switchPropertyAction } from '@/app/actions/properties';

interface HotelInfo {
  id: string;
  name: string;
  city: string;
  slug: string;
  subscription_plan: string;
  subscription_status: string;
  role: string;
}

interface PropertySwitcherProps {
  currentHotelId: string;
  currentHotelName: string;
  hotels: HotelInfo[];
  variant?: 'sidebar' | 'mobile';
}

/**
 * Selector de "Mis Propiedades" — Invariante de Aisolamiento Operativo.
 * Permite al hotelero cambiar entre sus propiedades sin confusión.
 * Heurística #2: lenguaje empático, cero jerga técnica.
 */
export default function PropertySwitcher({
  currentHotelId,
  currentHotelName,
  hotels,
  variant = 'sidebar',
}: PropertySwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = () => setIsOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isOpen]);

  const handleSwitch = async (hotel: HotelInfo) => {
    if (hotel.id === currentHotelId) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    const formData = new FormData();
    formData.append('hotelId', hotel.id);

    const result = await switchPropertyAction(formData);
    if (result.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setIsSwitching(false);
      alert('Error al cambiar de propiedad: ' + result.error);
    }
  };

  if (hotels.length <= 1) {
    // No hay otras propiedades — mostrar solo el nombre actual
    return (
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-[var(--radius-squircle-lg)] bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
          {currentHotelName?.[0] || 'H'}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <h1 className="font-bold text-sidebar-foreground truncate text-sm tracking-tight">
            {currentHotelName}
          </h1>
        </div>
      </div>
    );
  }

  if (variant === 'mobile') {
    return (
      <div className="px-4 pt-4 pb-2 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-brand-400" />
            <span className="text-xs font-bold text-sidebar-foreground truncate">
              {currentHotelName}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            aria-label="Cambiar de propiedad"
          >
            <ChevronDown
              size={16}
              className={cn(
                'text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </button>
        </div>

        {isOpen && (
          <div className="mt-2 space-y-1">
            {hotels.map((hotel) => (
              <button
                key={hotel.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSwitch(hotel);
                }}
                disabled={isSwitching}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors',
                  hotel.id === currentHotelId
                    ? 'bg-brand-500/10 text-brand-400 font-bold'
                    : 'text-sidebar-foreground/70 hover:bg-accent hover:text-sidebar-foreground'
                )}
              >
                {hotel.id === currentHotelId && <Check size={14} />}
                <span className="truncate flex-1 text-left">{hotel.name}</span>
                {hotel.id === currentHotelId && isSwitching && (
                  <Loader2 size={12} className="animate-spin" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Sidebar variant
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full flex items-center gap-3 p-8 hover:bg-accent/10 transition-colors rounded-t-[var(--radius-squircle-2xl)]"
        aria-label="Cambiar de propiedad"
        aria-expanded={isOpen}
      >
        <div className="size-10 rounded-[var(--radius-squircle-lg)] bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 shrink-0">
          {currentHotelName?.[0] || 'H'}
        </div>
        <div className="flex flex-col min-w-0 flex-1 text-left">
          <h1 className="font-bold text-sidebar-foreground truncate text-sm tracking-tight">
            {currentHotelName}
          </h1>
          <p className="text-[10px] text-muted-foreground/60 font-medium">
            Mis Propiedades ({hotels.length})
          </p>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'text-muted-foreground/40 transition-transform shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-sidebar border border-sidebar-border rounded-[var(--radius-squircle-xl)] shadow-2xl z-50 overflow-hidden">
          {hotels.map((hotel) => (
            <button
              key={hotel.id}
              onClick={(e) => {
                e.stopPropagation();
                handleSwitch(hotel);
              }}
              disabled={isSwitching}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                hotel.id === currentHotelId
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'hover:bg-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground'
              )}
            >
              <div
                className={cn(
                  'size-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0',
                  hotel.id === currentHotelId
                    ? 'bg-gradient-to-br from-brand-500 to-brand-700'
                    : 'bg-gradient-to-br from-muted to-muted/50'
                )}
              >
                {hotel.name?.[0] || 'H'}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold truncate">{hotel.name}</span>
                <span className="text-[10px] text-muted-foreground/50 truncate">
                  {hotel.city || 'Sin ciudad'}
                </span>
              </div>
              {hotel.id === currentHotelId && (
                <Check size={14} className="text-brand-400 shrink-0" />
              )}
              {hotel.id === currentHotelId && isSwitching && (
                <Loader2 size={12} className="animate-spin text-brand-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
