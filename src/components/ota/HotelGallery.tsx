import Image from 'next/image';
import React from 'react';
import { MapPin, Mountain, Coffee, Sunset } from 'lucide-react';
import { getImageSizeUrl, type ImageBlurMeta } from '@/lib/image-config';
import { useTranslations } from 'next-intl';

// ============================================================================
// HOTEL GALLERY — Seccion cinematografica con storytelling
//
// Muestra el hotel ANTES de las habitaciones. Cada foto cuenta una historia.
// Disenado para funcionar con 2+ imagenes y extensible a galeria completa.
// ============================================================================

interface HotelGalleryProps {
  images: { url: string; alt?: string }[];
  hotelName: string;
  location: string;
  blurs?: ImageBlurMeta;
}

// Iconos por posicion por tipo de destino — no necesitan traduccion
const CAPTION_ICONS_BY_TYPE: Record<string, React.ElementType[]> = {
  montaña: [Mountain, Coffee, Sunset, MapPin],
  playa: [Sunset, MapPin, Coffee, Mountain],
  ciudad: [MapPin, Coffee, Sunset, Mountain],
  lago: [Sunset, Coffee, MapPin, Mountain],
};

// Detecta el tipo de destino segun la ubicacion
function detectLocationType(location: string): string {
  const loc = location.toLowerCase();
  if (loc.includes('montaña') || loc.includes('sierra') || loc.includes('nevado') || loc.includes('páramo') || loc.includes('boyac') || loc.includes('andes')) return 'montaña';
  if (loc.includes('playa') || loc.includes('mar') || loc.includes('cartagena') || loc.includes('santa marta') || loc.includes('caribe') || loc.includes('costa')) return 'playa';
  if (loc.includes('lago') || loc.includes('laguna') || loc.includes('embalse')) return 'lago';
  if (loc.includes('bogotá') || loc.includes('medellín') || loc.includes('cali') || loc.includes('centro') || loc.includes('ciudad')) return 'ciudad';
  return 'montaña'; // default
}

function getStoryCaptions(location: string, t: ReturnType<typeof useTranslations>) {
  const type = detectLocationType(location);
  const icons = CAPTION_ICONS_BY_TYPE[type] || CAPTION_ICONS_BY_TYPE.montaña;
  return Array.from({ length: 4 }, (_, i) => ({
    icon: icons[i],
    title: t(`ota.hotelGallery.storyCaptions.${type}.${i}.title`),
    story: t(`ota.hotelGallery.storyCaptions.${type}.${i}.story`),
  }));
}

export default function HotelGallery({ images, hotelName, location, blurs }: HotelGalleryProps) {
  const t = useTranslations();
  if (images.length === 0) return null;

  const captions = getStoryCaptions(location, t);

  return (
    <section className="space-y-8">
      {/* Titulo de seccion */}
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 backdrop-blur-xl border border-brand-500/20 text-brand-600 text-[10px] font-bold uppercase tracking-widest">
          <MapPin size={11} /> {location}
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
          {t('ota.hotelGallery.discover', { hotelName })}
        </h2>
        <p className="text-muted-foreground font-lora italic text-base max-w-lg mx-auto">
          {t('ota.hotelGallery.subtitle')}
        </p>
      </div>

      {/* ==================================================================
          BENTO GRID — Layout cinematografico adaptativo
          ================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        {/* Imagen principal — ocupa 2 columnas en desktop */}
        {images[0] && (
          <div className="md:col-span-2 relative h-[320px] md:h-[420px] rounded-[var(--radius-squircle-2xl)] overflow-hidden group">
            <Image
              src={getImageSizeUrl(images[0].url, 'full')}
              alt={images[0].alt ?? hotelName}
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 66vw"
              quality={85}
              priority
              placeholder={blurs?.gallery_blurs?.[0]?.blur ? 'blur' : undefined}
              blurDataURL={blurs?.gallery_blurs?.[0]?.blur}
            />
            {/* Glass overlay con storytelling */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <div className="flex items-start gap-3">
                <div className="shrink-0 size-10 glass-pill flex items-center justify-center">
                  {(() => { const Icon = captions[0].icon; return <Icon size={18} className="text-white" strokeWidth={1.5} />; })()}
                </div>
                <div>
                  <p className="text-white font-bold text-lg leading-tight">{captions[0].title}</p>
                  <p className="text-white/70 text-sm font-lora leading-relaxed mt-1">{captions[0].story}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Imagen secundaria — columna derecha */}
        {images[1] && (
          <div className="relative h-[320px] md:h-[420px] rounded-[var(--radius-squircle-2xl)] overflow-hidden group">
            <Image
              src={getImageSizeUrl(images[1].url, 'card')}
              alt={images[1].alt ?? `${hotelName} detalle`}
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
              quality={90}
              placeholder={blurs?.gallery_blurs?.[1]?.blur ? 'blur' : undefined}
              blurDataURL={blurs?.gallery_blurs?.[1]?.blur}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-start gap-3">
                <div className="shrink-0 size-9 glass-pill flex items-center justify-center">
                  {(() => { const Icon = captions[1].icon; return <Icon size={16} className="text-white" strokeWidth={1.5} />; })()}
                </div>
                <div>
                  <p className="text-white font-bold text-base leading-tight">{captions[1].title}</p>
                  <p className="text-white/60 text-xs font-lora leading-relaxed mt-1">{captions[1].story}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fila inferior — imagenes adicionales (si hay 3+) */}
      {images.length > 2 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {images.slice(2).map((img, i) => {
            const caption = captions[Math.min(i + 2, captions.length - 1)];
            const Icon = caption.icon;
            return (
              <div key={i} className="relative h-[180px] rounded-[1.5rem] overflow-hidden group">
                <Image
                  src={getImageSizeUrl(img.url, 'card')}
                  alt={img.alt ?? `${hotelName} ${i + 3}`}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="25vw"
                  quality={80}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2">
                    {(() => { const Icon = caption.icon; return <Icon size={14} className="text-white/80" strokeWidth={1.5} />; })()}
                    <p className="text-white/90 text-xs font-bold">{caption.title}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
