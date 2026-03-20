'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MapPin, Star } from 'lucide-react';
import Image from 'next/image';

// Definimos la interfaz para TypeScript (Auditoría de datos)
interface Hotel {
  id: string;
  name: string;
  location: string;
  city_slug?: string;
  min_price: number;
  main_image_url: string;
}

export default function HotelCard({ hotel }: { hotel: Hotel }) {
  const router = useRouter();

  // Fallback visual auditado del código legacy
  const bgImage =
    hotel.main_image_url ||
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=2049';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      className='group relative aspect-[4/5] md:aspect-[3/4] rounded-[2rem] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 bg-hospeda-900'
      onClick={() => router.push(`/hotel/${hotel.city_slug}`)} 
// Nota: en fetchOTAHotelsAction mapeaste h.slug como city_slug
    >
      {/* IMAGEN OPTIMIZADA NEXT.JS */}
      <Image
        src={bgImage}
        alt={hotel.name}
        fill
        className='object-cover transition-transform duration-700 group-hover:scale-110'
        sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
      />

      {/* GRADIENTE FORENSE (Legibilidad) */}
      <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity' />

      {/* INFO DEL HOTEL */}
      <div className='absolute bottom-0 left-0 right-0 p-6 text-white'>
        <div className='flex justify-between items-end mb-2'>
          <div>
            <h3 className='text-xl font-display font-bold leading-tight mb-1 group-hover:text-hospeda-300 transition-colors'>
              {hotel.name}
            </h3>
            <div className='flex items-center gap-1 text-xs font-medium text-white/80'>
              <MapPin
                size={12}
                className='text-emerald-400'
              />
              {hotel.city_slug
                ? hotel.city_slug.replace('-', ' ')
                : hotel.location}
            </div>
          </div>

          <div className='flex items-center gap-1 bg-yellow-500/20 backdrop-blur-md px-2 py-1 rounded-lg border border-yellow-500/30'>
            <Star
              size={12}
              className='text-yellow-400 fill-yellow-400'
            />
            <span className='text-xs font-bold'>4.9</span>
          </div>
        </div>

        {/* PRECIO */}
        <div className='flex items-center justify-between mt-4 pt-4 border-t border-white/10'>
          <div className='flex flex-col'>
            <span className='text-[10px] text-white/60 uppercase'>Desde</span>
            <span className='text-lg font-bold'>
              ${(hotel.min_price || 0).toLocaleString()}
              <span className='text-xs font-normal text-white/60'> /noche</span>
            </span>
          </div>

          <div className='w-10 h-10 rounded-full bg-white text-black flex items-center justify-center group-hover:bg-hospeda-400 group-hover:text-white transition-all transform group-hover:rotate-[-45deg]'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M5 12h14' />
              <path d='m12 5 7 7-7 7' />
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
