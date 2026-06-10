"use client";

import { MapPin, Clock, ShieldAlert, Navigation, Phone, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import HotelDetailMap from './HotelDetailMapWrapper';
import { useState } from 'react';

interface HotelInfoSectionProps {
  hotelName: string;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  googleMapsUrl?: string | null;
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
  googleMapsUrl,
  cancellationPolicy,
  checkInTime,
  checkOutTime,
  receptionHours,
  latitude,
  longitude,
}: HotelInfoSectionProps) {
  const t = useTranslations();
  const [mapError, setMapError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Build Google Maps navigation URL
  const mapsNavUrl = googleMapsUrl || 
    (latitude && longitude ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}` : null) ||
    (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null);

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
        {/* Columna izquierda: Mapa + Direccion */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Mapa embebido — siempre visible (Heurística #1) */}
          {googleMapsUrl && !mapError ? (
            <div className="rounded-[var(--radius-squircle-2xl)] overflow-hidden border border-border h-48 relative">
              <iframe
                src={googleMapsUrl.replace('/view?usp=sharing', '/embed?pb=').includes('embed') ? googleMapsUrl : `https://www.google.com/maps?q=${encodeURIComponent(location || '')}&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`${t('ota.hotelInfo.mapTitle')} ${hotelName}`}
                className="grayscale-[0.3] hover:grayscale-0 transition-all"
                onError={() => setMapError(true)}
              />
              {/* Skeleton loading state */}
              <div className="absolute inset-0 bg-muted animate-pulse pointer-events-none" />
            </div>
          ) : latitude != null && longitude != null && !mapError ? (
            <HotelDetailMap
              latitude={latitude}
              longitude={longitude}
              hotelName={hotelName}
              location={location || ''}
            />
          ) : (
            /* Fallback: Mapa no disponible (Heurística #9) */
            <div className="rounded-[var(--radius-squircle-2xl)] overflow-hidden border border-border h-48 bg-muted flex items-center justify-center">
              <div className="text-center p-4">
                <MapPin size={32} className="text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">{location || address || t('ota.hotelInfo.mapNotAvailable')}</p>
              </div>
            </div>
          )}

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
          {(address || mapsNavUrl || phone) && (
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

          {/* Detalles ocultos — Dirección + Teléfono + Cómo llegar */}
          {showDetails && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Botón "Cómo llegar" — Visualmente secundario (no compite con CTA primario) */}
              {mapsNavUrl && (
                <a
                  href={mapsNavUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir ubicación de ${hotelName} en Google Maps`}
                  className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:border-foreground/20 rounded-[var(--radius-squircle-xl)] transition-all active:scale-[0.98]"
                >
                  <Navigation size={14} />
                  {t('ota.hotelInfo.getDirections', { defaultValue: 'Cómo llegar' })}
                  <ExternalLink size={12} className="opacity-50" />
                </a>
              )}

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
