import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Star, Sparkles } from 'lucide-react';

const SecretRevealCard = ({ asset, onClick }) => {
  // --- FÍSICA DE FLUIDOS (Mantenida intacta) ---
  const fluidPhysics = { duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] };

  return (
    <motion.div
      className='group relative w-full aspect-[3/4] cursor-pointer overflow-hidden rounded-sm bg-[#050505]' // Fondo casi negro absoluto
      initial='rest'
      whileHover='hover'
      animate='rest'
      onClick={onClick}
    >
      {/* 1. IMAGEN DE FONDO (Zoom cinemático) */}
      <div className='absolute inset-0 overflow-hidden'>
        <motion.img
          src={asset.image}
          alt={asset.title}
          className='w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-700'
          variants={{
            rest: { scale: 1 },
            hover: { scale: 1.1 },
          }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
      </div>

      {/* 2. GRADIENTE DE LECTURA (Reforzado para contraste) */}
      {/* Usamos via-black/60 para asegurar que el texto blanco siempre tenga fondo oscuro */}
      <motion.div
        className='absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent'
        variants={{
          rest: { opacity: 0.9 },
          hover: { opacity: 0.8 },
        }}
        transition={fluidPhysics}
      />

      {/* 3. CAPA "LOCKED" (Blur) */}
      {asset.isSecret && (
        <motion.div
          className='absolute inset-0 backdrop-blur-[2px] bg-black/10 mix-blend-overlay'
          variants={{
            rest: { backdropFilter: 'blur(2px)' },
            hover: { backdropFilter: 'blur(0px)' },
          }}
          transition={fluidPhysics}
        />
      )}

      {/* 4. INTERFAZ DE USUARIO (UI) */}
      <div className='absolute inset-0 p-8 flex flex-col justify-between z-20'>
        {/* HEADER: STATUS DE EXCLUSIVIDAD */}
        <div className='flex justify-between items-start'>
          <motion.div
            className='flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-black/60 backdrop-blur-md shadow-lg'
            variants={{
              rest: { y: 0, borderColor: 'rgba(255,255,255,0.2)' },
              hover: { y: 5, borderColor: '#D4AF37' },
            }}
            transition={fluidPhysics}
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Lock
                size={12}
                className='text-[#D4AF37]'
              />
            </motion.div>
            <span className='text-[9px] tracking-[0.2em] uppercase text-[#D4AF37] font-bold shadow-black drop-shadow-md'>
              Private Access
            </span>
          </motion.div>

          <div className='flex gap-1 text-[#D4AF37]/80'>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={8}
                fill='currentColor'
              />
            ))}
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className='relative'>
          {/* TAGLINE (Blanco/Gris claro para legibilidad) */}
          <motion.p
            className='text-[10px] tracking-[0.1em] text-gray-200 italic mb-3 font-serif border-l-2 border-[#D4AF37] pl-3 drop-shadow-md'
            variants={{
              rest: { opacity: 0, x: -10 },
              hover: { opacity: 1, x: 0 },
            }}
            transition={fluidPhysics}
          >
            "{asset.tagline}"
          </motion.p>

          {/* TÍTULO MAGNÉTICO (Blanco Puro) */}
          <motion.h3
            className='font-serif text-3xl md:text-4xl text-white mb-2 leading-tight drop-shadow-lg'
            variants={{
              rest: { y: 0 },
              hover: { y: -5, textShadow: '0 0 20px rgba(212, 175, 55, 0.3)' },
            }}
            transition={fluidPhysics}
          >
            {asset.title}
          </motion.h3>

          {/* FEATURES PÚBLICOS (Gris claro) */}
          <div className='flex flex-wrap gap-2 mb-8 text-[9px] tracking-widest uppercase text-gray-300 font-medium'>
            {asset.publicFeatures.map((feat, i) => (
              <span
                key={i}
                className='flex items-center gap-2 drop-shadow-md'
              >
                {feat}{' '}
                {i < asset.publicFeatures.length - 1 && (
                  <span className='text-[#D4AF37]'>•</span>
                )}
              </span>
            ))}
          </div>

          {/* ACTION BAR */}
          <motion.div
            className='border-t border-white/20 pt-5 flex justify-between items-end'
            variants={{
              rest: { opacity: 0.9, y: 10 },
              hover: { opacity: 1, y: 0 },
            }}
            transition={{ ...fluidPhysics, delay: 0.05 }}
          >
            <div>
              <span className='block text-[8px] uppercase text-gray-400 font-bold tracking-[0.3em] mb-1 drop-shadow-sm'>
                Membership Deposit
              </span>
              <div className='text-xl font-serif text-white flex items-baseline gap-1 drop-shadow-md'>
                <span className='text-sm text-[#D4AF37]'>$</span>
                {asset.priceStartingAt}
              </div>
            </div>

            <div className='flex items-center gap-3 group/btn'>
              <span className='text-[9px] tracking-[0.25em] uppercase text-white font-bold group-hover/btn:text-[#D4AF37] transition-colors duration-300 drop-shadow-md'>
                Solicitar Acceso
              </span>
              <div className='p-2 rounded-full border border-white/30 group-hover/btn:border-[#D4AF37] group-hover/btn:bg-[#D4AF37]/10 transition-all duration-500 bg-black/40'>
                <Sparkles
                  size={14}
                  className='text-white group-hover/btn:text-[#D4AF37]'
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* MARCO DORADO FINO */}
      <motion.div
        className='absolute inset-0 border-[0.5px] border-[#D4AF37] pointer-events-none'
        variants={{
          rest: { opacity: 0, scale: 0.98 },
          hover: { opacity: 1, scale: 1 },
        }}
        transition={fluidPhysics}
      />
    </motion.div>
  );
};

export default SecretRevealCard;
