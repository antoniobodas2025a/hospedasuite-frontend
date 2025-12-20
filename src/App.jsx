import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Mountain, Wine } from 'lucide-react';
import { LUXURY_CATALOG } from './data/luxury-catalog';
import SecretRevealCard from './components/SecretRevealCard';
import ConciergeModal from './components/ConciergeModal'; // <--- NUEVO IMPORT

// COMPONENTES UI
const Logo = () => (
  <div className='z-50 mix-blend-difference pointer-events-none'>
    <h1 className='font-serif text-3xl tracking-[0.2em] text-[#D4AF37] text-center'>
      LEYVA
    </h1>
    <span className='block text-[0.5rem] tracking-[0.6em] uppercase text-gray-400 mt-1 pl-1 text-center'>
      Private Ecosystem
    </span>
  </div>
);

function App() {
  const [view, setView] = useState('landing');
  const [hoveredSplit, setHoveredSplit] = useState(null);

  // ESTADO DEL MODAL
  const [selectedAsset, setSelectedAsset] = useState(null); // null = cerrado

  const displayedItems =
    view === 'landing'
      ? []
      : LUXURY_CATALOG.filter((item) => item.category === view);

  return (
    <div className='min-h-screen bg-[#050505] text-[#f5f5f5] font-sans overflow-x-hidden selection:bg-[#D4AF37] selection:text-black'>
      {/* FONDO */}
      <div className='fixed inset-0 opacity-[0.04] pointer-events-none bg-noise z-0 mix-blend-overlay'></div>
      <div className='fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1c15] via-[#0a0c08] to-[#000000] pointer-events-none z-0'></div>

      <AnimatePresence mode='wait'>
        {/* === ESCENA 1: PORTAL (SPLIT SCREEN) === */}
        {view === 'landing' && (
          <motion.div
            key='landing'
            className='relative w-full h-screen flex flex-col md:flex-row overflow-hidden'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.8 } }}
          >
            <div className='absolute top-8 left-1/2 -translate-x-1/2 z-40'>
              <Logo />
            </div>

            {/* IZQUIERDA: STAY */}
            <motion.div
              className='relative h-1/2 md:h-full cursor-pointer group border-b md:border-b-0 md:border-r border-white/5 overflow-hidden bg-black'
              onMouseEnter={() => setHoveredSplit('STAY')}
              onMouseLeave={() => setHoveredSplit(null)}
              onClick={() => setView('STAY')}
              initial={{ flex: 1 }}
              animate={{
                flex: hoveredSplit === 'STAY' ? 1.75 : 1,
                filter:
                  hoveredSplit === 'RITUAL'
                    ? 'grayscale(100%) brightness(0.5)'
                    : 'grayscale(0%) brightness(1)',
              }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className='absolute inset-0 w-full h-full'
                animate={{ scale: hoveredSplit === 'STAY' ? 1.05 : 1 }}
                transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <img
                  src='https://images.unsplash.com/photo-1613545325278-f24b0cae1224?q=80&w=1920&auto=format&fit=crop'
                  className='w-full h-full object-cover'
                  alt='Architecture'
                />
                <motion.div
                  className='absolute inset-0 bg-black'
                  animate={{ opacity: hoveredSplit === 'STAY' ? 0.2 : 0.5 }}
                  transition={{ duration: 0.8 }}
                />
              </motion.div>
              <div className='absolute inset-0 flex flex-col justify-center items-center z-20 pointer-events-none'>
                <motion.div
                  className='flex items-center gap-2 mb-4 text-[#D4AF37]'
                  animate={{
                    y: hoveredSplit === 'STAY' ? 0 : 20,
                    opacity: hoveredSplit === 'STAY' ? 1 : 0,
                  }}
                >
                  <Mountain size={14} />
                  <span className='text-[9px] tracking-[0.3em] uppercase'>
                    The Collection
                  </span>
                </motion.div>
                <h2 className='font-serif text-6xl md:text-8xl italic text-white mix-blend-screen whitespace-nowrap'>
                  Stay.
                </h2>
              </div>
            </motion.div>

            {/* DERECHA: CURATOR */}
            <motion.div
              className='relative h-1/2 md:h-full cursor-pointer group overflow-hidden bg-black'
              onMouseEnter={() => setHoveredSplit('RITUAL')}
              onMouseLeave={() => setHoveredSplit(null)}
              onClick={() => setView('RITUAL')}
              initial={{ flex: 1 }}
              animate={{
                flex: hoveredSplit === 'RITUAL' ? 1.75 : 1,
                filter:
                  hoveredSplit === 'STAY'
                    ? 'grayscale(100%) brightness(0.5)'
                    : 'grayscale(0%) brightness(1)',
              }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className='absolute inset-0 w-full h-full'
                animate={{ scale: hoveredSplit === 'RITUAL' ? 1.05 : 1 }}
                transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <img
                  src='https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1920&auto=format&fit=crop'
                  className='w-full h-full object-cover'
                  alt='Atmosphere'
                />
                <motion.div
                  className='absolute inset-0 bg-black'
                  animate={{ opacity: hoveredSplit === 'RITUAL' ? 0.2 : 0.5 }}
                  transition={{ duration: 0.8 }}
                />
              </motion.div>
              <div className='absolute inset-0 flex flex-col justify-center items-center z-20 pointer-events-none'>
                <motion.div
                  className='flex items-center gap-2 mb-4 text-[#c2410c]'
                  animate={{
                    y: hoveredSplit === 'RITUAL' ? 0 : 20,
                    opacity: hoveredSplit === 'RITUAL' ? 1 : 0,
                  }}
                >
                  <Wine size={14} />
                  <span className='text-[9px] tracking-[0.3em] uppercase'>
                    The Experiences
                  </span>
                </motion.div>
                <h2 className='font-serif text-6xl md:text-8xl italic text-white mix-blend-screen whitespace-nowrap'>
                  Curator.
                </h2>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* === ESCENA 2: CATÁLOGO === */}
        {view !== 'landing' && (
          <motion.div
            key='catalog'
            className='relative z-10'
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className='pt-12 px-8 md:px-20 flex justify-between items-center'>
              <button
                onClick={() => setView('landing')}
                className='group flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase text-gray-400 hover:text-[#D4AF37] transition-colors'
              >
                <div className='p-2 rounded-full border border-white/10 group-hover:border-[#D4AF37] transition-colors'>
                  <ArrowLeft size={14} />
                </div>
                Return to Ecosystem
              </button>
              <Logo />
            </header>

            <div className='px-8 md:px-20 mt-20 mb-16 text-center md:text-left'>
              <span
                className={`block text-[10px] tracking-[0.4em] uppercase mb-4 ${
                  view === 'STAY' ? 'text-[#D4AF37]' : 'text-[#c2410c]'
                }`}
              >
                {view === 'STAY' ? 'Tier A Sanctuaries' : 'Signature Rituals'}
              </span>
              <h2 className='text-5xl md:text-7xl font-serif text-white italic'>
                {view === 'STAY' ? 'Secret Villas' : 'Curated Moments'}
              </h2>
            </div>

            <main className='px-4 md:px-20 pb-32 max-w-[1800px] mx-auto'>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-32'>
                {displayedItems.map((asset, index) => (
                  <div
                    key={asset.id}
                    className={`${index % 2 !== 0 ? 'lg:translate-y-24' : ''}`}
                  >
                    <SecretRevealCard
                      asset={asset}
                      onClick={() => setSelectedAsset(asset)} // <--- ABRE EL MODAL
                    />
                  </div>
                ))}
              </div>
            </main>

            <footer className='py-12 text-center border-t border-white/5'>
              <div className='flex justify-center gap-2 items-center opacity-40 mb-4'>
                <Sparkles
                  size={12}
                  className='text-[#D4AF37]'
                />
                <span className='text-[8px] tracking-[0.3em] uppercase'>
                  White Glove Service
                </span>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === MODAL DE CONCIERGE (Fuera del AnimatePresence principal) === */}
      <ConciergeModal
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        asset={selectedAsset}
      />
    </div>
  );
}

export default App;
