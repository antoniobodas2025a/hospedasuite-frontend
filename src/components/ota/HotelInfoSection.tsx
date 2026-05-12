import { MapPin, Clock, ShieldAlert, Navigation, Phone } from 'lucide-react';

// ============================================================================
// HOTEL INFO SECTION — Mapa, politicas e instrucciones de llegada
//
// Muestra la ubicacion, horarios y politicas del hotel para generar confianza
// y reducir la friccion antes de reservar.
// ============================================================================

interface HotelInfoSectionProps {
  hotelName: string;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  googleMapsUrl?: string | null;
  cancellationPolicy?: string | null;
}

export default function HotelInfoSection({
  hotelName,
  location,
  address,
  phone,
  googleMapsUrl,
  cancellationPolicy,
}: HotelInfoSectionProps) {
  return (
    <div className="bg-card/60 backdrop-blur-xl rounded-[2rem] shadow-sm border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-border/40">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MapPin size={20} className="text-brand-500" />
          Ubicacion y Detalles
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Columna izquierda: Mapa + Direccion */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Mapa embebido */}
          {googleMapsUrl ? (
            <div className="rounded-2xl overflow-hidden border border-border h-48">
              <iframe
                src={googleMapsUrl.replace('/view?usp=sharing', '/embed?pb=').includes('embed') ? googleMapsUrl : `https://www.google.com/maps?q=${encodeURIComponent(location || '')}&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Ubicacion de ${hotelName}`}
                className="grayscale-[0.3] hover:grayscale-0 transition-all"
              />
            </div>
          ) : location ? (
            <div className="rounded-2xl overflow-hidden border border-border h-48 bg-muted flex items-center justify-center">
              <div className="text-center p-4">
                <MapPin size={32} className="text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">{location}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Mapa no disponible</p>
              </div>
            </div>
          ) : null}

          {/* Direccion */}
          {address && (
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 border border-brand-100">
                <Navigation size={16} className="text-brand-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Direccion</p>
                <p className="text-sm text-foreground/80">{address}</p>
              </div>
            </div>
          )}

          {/* Telefono */}
          {phone && (
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 border border-secondary/20">
                <Phone size={16} className="text-secondary" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Contacto</p>
                <p className="text-sm text-foreground/80">{phone}</p>
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: Horarios + Politicas */}
        <div className="p-6 md:p-8 space-y-6 border-t md:border-t-0 md:border-l border-border/40">
          {/* Horarios */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <Clock size={14} />
              Horarios
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-xl">
                <span className="text-sm text-muted-foreground">Check-in</span>
                <span className="text-sm font-bold text-foreground">15:00</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-xl">
                <span className="text-sm text-muted-foreground">Check-out</span>
                <span className="text-sm font-bold text-foreground">13:00</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-xl">
                <span className="text-sm text-muted-foreground">Recepcion</span>
                <span className="text-sm font-bold text-foreground">24/7</span>
              </div>
            </div>
          </div>

          {/* Politica de cancelacion */}
          {cancellationPolicy && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <ShieldAlert size={14} className="text-warm-500" />
                Politica de Cancelacion
              </h3>
              <div className="p-4 bg-warm-50/50 rounded-xl border border-warm-100">
                <p className="text-sm text-muted-foreground leading-relaxed">{cancellationPolicy}</p>
              </div>
            </div>
          )}

          {/* Nota generica si no hay politica */}
          {!cancellationPolicy && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <ShieldAlert size={14} className="text-warm-500" />
                Politica de Cancelacion
              </h3>
              <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/20">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cancelacion gratuita hasta 48 horas antes del check-in. Despues de ese plazo se cobra la primera noche.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
