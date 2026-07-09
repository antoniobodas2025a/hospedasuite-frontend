"use client";

import { MapPin, Clock, ShieldAlert, Navigation, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import LocationCard from './LocationCard';
import { useState } from 'react';

interface HotelInfoSectionProps {
  hotelName: string;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  cancellationPolicy?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  receptionHours?: string | null;
  /** PRD-009: Coordenadas para mapa Leaflet como fallback */
  latitude?: number | null;
  longitude?: number | null;
}

export default function HotelInfoSection({
  hotelName,
  location,
  address,
  phone,
  cancellationPolicy,
  checkInTime,
  checkOutTime,
  receptionHours,
  latitude,
  longitude,
}: HotelInfoSectionProps) {
  const t = useTranslations();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-border/40">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MapPin size={20} className="text-brand-500" />
          {t('ota.hotelInfo.locationDetails')}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Columna izquierda: LocationCard + Direccion */}
        <div className="p-6 md:p-8 space-y-6">
          {/* LocationCard — hybrid display (static map or textual fallback) */}
          <LocationCard
            hotelName={hotelName}
            address={address}
            latitude={latitude}
            longitude={longitude}
          />

          {/* Zona general — siempre visible (Progressive Disclosure) */}
          {location && (
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-[var(--radius-squircle-lg)] bg-muted/50 flex items-center justify-center shrink-0 border border-border/50">
                <MapPin size={16} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Zona</p>
                <p className="text-sm text-foreground/80">{location}</p>
              </div>
            </div>
          )}

          {/* Toggle: Ver detalles de llegada (2 clics deliberados) */}
          {phone && (
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              aria-expanded={showDetails}
            >
              {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showDetails ? 'Ocultar detalles' : 'Ver detalles de llegada'}
            </button>
          )}

          {/* Detalles ocultos — Dirección + Teléfono */}
          {showDetails && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Direccion exacta */}
              {address && (
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-[var(--radius-squircle-lg)] bg-brand-50 flex items-center justify-center shrink-0 border border-brand-100">
                    <Navigation size={16} className="text-brand-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{t('ota.hotelInfo.address')}</p>
                    <p className="text-sm text-foreground/80">{address}</p>
                  </div>
                </div>
              )}

              {/* Telefono */}
              {phone && (
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-[var(--radius-squircle-lg)] bg-secondary/10 flex items-center justify-center shrink-0 border border-secondary/20">
                    <Phone size={16} className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{t('ota.hotelInfo.contact')}</p>
                    <p className="text-sm text-foreground/80">{phone}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Columna derecha: Horarios + Politicas */}
        <div className="p-6 md:p-8 space-y-6 border-t md:border-t-0 md:border-l border-border/40">
          {/* Horarios */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <Clock size={14} />
              {t('ota.hotelInfo.schedules')}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-[var(--radius-squircle-lg)]">
                <span className="text-sm text-muted-foreground">{t('ota.hotelInfo.checkin')}</span>
                <span className="text-sm font-bold text-foreground">{checkInTime || '15:00'}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-[var(--radius-squircle-lg)]">
                <span className="text-sm text-muted-foreground">{t('ota.hotelInfo.checkout')}</span>
                <span className="text-sm font-bold text-foreground">{checkOutTime || '13:00'}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-[var(--radius-squircle-lg)]">
                <span className="text-sm text-muted-foreground">{t('ota.hotelInfo.reception')}</span>
                <span className="text-sm font-bold text-foreground">{receptionHours || '24/7'}</span>
              </div>
            </div>
          </div>

          {/* Politica de cancelacion */}
          {cancellationPolicy && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <ShieldAlert size={14} className="text-warm-500" />
                {t('ota.hotelInfo.cancellationPolicy')}
              </h3>
              <div className="p-4 bg-warm-50/50 rounded-[var(--radius-squircle-lg)] border border-warm-100">
                <p className="text-sm text-muted-foreground leading-relaxed">{cancellationPolicy}</p>
              </div>
            </div>
          )}

          {/* Nota generica si no hay politica */}
          {!cancellationPolicy && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <ShieldAlert size={14} className="text-warm-500" />
                {t('ota.hotelInfo.cancellationPolicy')}
              </h3>
              <div className="p-4 bg-secondary/10 rounded-[var(--radius-squircle-lg)] border border-secondary/20">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('ota.hotelInfo.defaultCancellationPolicy')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
