import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, ArrowRight } from 'lucide-react';

const HotelCard = ({ hotel }) => {
  const navigate = useNavigate();

  // Fallback si no hay foto
  const bgImage =
    hotel.main_image_url ||
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=2049';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      className='group relative aspect-[4/5] md:aspect-[3/4] rounded-[2rem] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500'
      onClick={() => navigate(`/hotel/${hotel.id}`)} // ✅ Conecta con tu BookingPage actual
    >
      {/* IMAGEN DE FONDO */}
      <img
        src={bgImage}
        alt={hotel.name}
        className='absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110'
      />

      {/* GRADIENTE DE PROTECCIÓN */}
      <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />

      {/* BADGE CATEGORÍA (FLOTANTE) */}
      <div className='absolute top-4 left-4'>
        <span className='px-3 py-1 bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold text-white uppercase tracking-wider'>
          {hotel.category || 'Hotel'}
        </span>
      </div>

      {/* INFO DEL HOTEL (INFERIOR) */}
      <div className='absolute bottom-0 left-0 right-0 p-6 text-white'>
        <div className='flex justify-between items-end mb-2'>
          <div>
            <h3 className='text-xl font-serif font-bold leading-tight mb-1'>
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

        {/* PRECIO Y CTA */}
        <div className='flex items-center justify-between mt-4 pt-4 border-t border-white/10'>
          <div className='flex flex-col'>
            <span className='text-[10px] text-white/60 uppercase'>Desde</span>
            <span className='text-lg font-bold'>
              ${(hotel.min_price || 0).toLocaleString()}
              <span className='text-xs font-normal text-white/60'> /noche</span>
            </span>
          </div>
          <button className='w-10 h-10 rounded-full bg-white text-black flex items-center justify-center group-hover:bg-emerald-400 transition-colors'>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default HotelCard;
