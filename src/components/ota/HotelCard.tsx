'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MapPin, Star } from 'lucide-react';
import Image from 'next/image';
import { getImageSizeUrl } from '@/lib/image-config';

interface Hotel {
  id: string;
  name: string;
  location: string;
  city_slug?: string;
  min_price: number;
  main_image_url: string;
  description?: string;
  reviewStats?: { averageRating: number; totalReviews: number };
  main_image_blur?: string;
}

export default function HotelCard({ hotel }: { hotel: Hotel }) {
  const router = useRouter();

  const bgImage =
    hotel.main_image_url ||
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=2049';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      className='group relative aspect-[4/5] md:aspect-[3/4] rounded-[var(--radius-squircle-2xl)] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 bg-brand-900'
      onClick={() => {
        if (!hotel.city_slug) return;
        router.push(`/hotel/${hotel.city_slug}`);
      }}
    >
      <Image
        src={getImageSizeUrl(bgImage, 'card')}
        alt={hotel.name}
        fill
        className='object-cover transition-transform duration-700 group-hover:scale-110'
        sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
        quality={75}
        placeholder={hotel.main_image_blur ? 'blur' : undefined}
        blurDataURL={hotel.main_image_blur}
      />

      <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity' />

      <div className='absolute bottom-0 left-0 right-0 p-6 text-white'>
        <div className='flex justify-between items-end mb-2'>
          <div>
            <h3 className='text-xl font-display font-bold leading-tight mb-1 group-hover:text-brand-300 transition-colors'>
              {hotel.name}
            </h3>
            <div className='flex items-center gap-1 text-xs font-medium text-white/80'>
              <MapPin
                size={12}
                className='text-secondary'
              />
              {hotel.city_slug
                ? hotel.city_slug.replace('-', ' ')
                : hotel.location}
            </div>
            {hotel.description && (
              <p className='mt-2 text-xs text-white/70 leading-snug line-clamp-2'>
                {hotel.description}
              </p>
            )}
          </div>

          <div className='flex items-center gap-1 bg-warm-500/20 backdrop-blur-md px-2 py-1 rounded-[var(--radius-squircle-md)] border border-warm-500/30'>
            <Star
              size={12}
              className='text-warm-400 fill-warm-400'
            />
            <span className='text-xs font-bold'>
              {hotel.reviewStats?.averageRating
                ? hotel.reviewStats.averageRating.toFixed(1)
                : 'Nuevo'}
            </span>
          </div>
        </div>

        <div className='flex items-center justify-between mt-4 pt-4 border-t border-white/10'>
          <div className='flex flex-col'>
            <span className='text-[10px] text-white/60 uppercase'>Desde</span>
            <span className='text-lg font-bold'>
              ${(hotel.min_price || 0).toLocaleString()}
              <span className='text-xs font-normal text-white/60'> /noche</span>
            </span>
          </div>

          <div className='w-10 h-10 rounded-full bg-white text-foreground flex items-center justify-center group-hover:bg-brand-400 group-hover:text-white transition-all transform group-hover:rotate-[-45deg]'>
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
