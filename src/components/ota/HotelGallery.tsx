import Image from 'next/image';
import React from 'react';
import { MapPin, Mountain, Coffee, Sunset } from 'lucide-react';

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
}

// Plantillas de storytelling por tipo de destino — se seleccionan segun la ubicacion
const STORY_CAPTIONS_BY_TYPE: Record<string, Array<{ icon: React.ElementType; title: string; story: string }>> = {
  montaña: [
    { icon: Mountain, title: 'Donde la montana abraza', story: 'Cada amanecer aqui no es solo luz — es el momento en que el valle despierta y te recuerda por que viniste.' },
    { icon: Coffee, title: 'Rituales de cada manana', story: 'El aroma del cafe local mezclado con el aire fresco de la montana. Asi empiezan los dias que no se olvidan.' },
    { icon: Sunset, title: 'Atardeceres que se quedan', story: 'Hay cielos que se miran y cielos que se sienten. Este es de los segundos.' },
    { icon: MapPin, title: 'Un lugar que te encuentra', story: 'No todos los destinos se eligen. Algunos te llaman sin que lo sepas.' },
  ],
  playa: [
    { icon: Sunset, title: 'Sal y horizonte infinito', story: 'El mar no pide permiso para entrar. Se cuela por la brisa, por el sonido, por la calma que te cambia el ritmo.' },
    { icon: MapPin, title: 'Arena bajo los pies', story: 'Hay lugares que se sienten antes de pisarlos. Este es uno de esos.' },
    { icon: Coffee, title: 'Manenas con brisa', story: 'Cafe, sal y silencio. La combinacion perfecta para empezar de nuevo.' },
    { icon: Mountain, title: 'Donde el cielo toca el agua', story: 'El horizonte aqui no es una linea. Es una promesa.' },
  ],
  ciudad: [
    { icon: MapPin, title: 'En el corazon de todo', story: 'A pasos de lo que importa, pero lo suficientemente lejos para descansar de verdad.' },
    { icon: Coffee, title: 'Cafe de esquina', story: 'Las mejores experiencias no estan en las guias. Estan en la vuelta de la esquina.' },
    { icon: Sunset, title: 'Luces que cuentan historias', story: 'Cuando cae la noche, la ciudad se transforma en un escenario hecho para vos.' },
    { icon: Mountain, title: 'Un oasis urbano', story: 'No hace falta irse lejos para encontrar calma. A veces esta escondida en el lugar correcto.' },
  ],
  lago: [
    { icon: Sunset, title: 'Espejo de agua', story: 'El lago no refleja solo el cielo. Refleja la calma que viniste a buscar.' },
    { icon: Coffee, title: 'Silencio que se saborea', story: 'Aca el tiempo se mide en olas suaves y tazas de cafe con vista.' },
    { icon: MapPin, title: 'Refugio natural', story: 'Entre el agua y el bosque, hay un lugar donde el ruido no llega.' },
    { icon: Mountain, title: 'Horizonte liquido', story: 'Mirar el lago es recordar que hay cosas que no necesitan explicacion.' },
  ],
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

function getStoryCaptions(location: string) {
  const type = detectLocationType(location);
  return STORY_CAPTIONS_BY_TYPE[type] || STORY_CAPTIONS_BY_TYPE.montaña;
}

export default function HotelGallery({ images, hotelName, location }: HotelGalleryProps) {
  if (images.length === 0) return null;

  const captions = getStoryCaptions(location);

  return (
    <section className="space-y-8">
      {/* Titulo de seccion */}
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 backdrop-blur-xl border border-brand-500/20 text-brand-600 text-[10px] font-bold uppercase tracking-widest">
          <MapPin size={11} /> {location}
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
          Descubri {hotelName}
        </h2>
        <p className="text-muted-foreground font-lora italic text-base max-w-lg mx-auto">
          Antes de elegir tu habitacion, deja que el lugar te elija a vos.
        </p>
      </div>

      {/* ==================================================================
          BENTO GRID — Layout cinematografico adaptativo
          ================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        {/* Imagen principal — ocupa 2 columnas en desktop */}
        {images[0] && (
          <div className="md:col-span-2 relative h-[320px] md:h-[420px] rounded-[2rem] overflow-hidden group">
            <Image
              src={images[0].url}
              alt={images[0].alt ?? hotelName}
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 66vw"
              quality={85}
            />
            {/* Glass overlay con storytelling */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <div className="flex items-start gap-3">
                <div className="shrink-0 size-10 rounded-xl bg-white/15 backdrop-blur-xl border border-white/20 flex items-center justify-center">
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
          <div className="relative h-[320px] md:h-[420px] rounded-[2rem] overflow-hidden group">
            <Image
              src={images[1].url}
              alt={images[1].alt ?? `${hotelName} detalle`}
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
              quality={90}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-start gap-3">
                <div className="shrink-0 size-9 rounded-lg bg-white/15 backdrop-blur-xl border border-white/20 flex items-center justify-center">
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
                  src={img.url}
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
