import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Tent,
  Building2,
  Home,
  Castle,
  ArrowRight,
  Plus,
} from 'lucide-react';
import HotelCard from '../components/ota/HotelCard';
import { useNavigate } from 'react-router-dom';

// --- CONFIGURACIÓN DE RENDIMIENTO ---
const HOTELS_PER_PAGE = 12;

const CATEGORIES = [
  { id: 'all', label: 'Todo', icon: SlidersHorizontal },
  { id: 'glamping', label: 'Glamping', icon: Tent },
  { id: 'hotel', label: 'Hoteles', icon: Building2 },
  { id: 'cabin', label: 'Cabañas', icon: Home },
  { id: 'boutique', label: 'Boutique', icon: Castle },
];

const HomePage = () => {
  const navigate = useNavigate();

  // ESTADOS
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(HOTELS_PER_PAGE);

  // 1. CARGA DE DATOS
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const { data, error } = await supabase
          .from('hotels')
          .select(
            'id, name, location, city_slug, min_price, category, main_image_url, status'
          )
          .eq('status', 'active') // Solo activos para producción
          .order('min_price', { ascending: true });

        if (error) throw error;
        setHotels(data || []);
      } catch (error) {
        console.error('Error cargando OTA:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHotels();
  }, []);

  // 2. FILTRADO MEMORIZADO
  const filteredHotels = useMemo(() => {
    let results = hotels;
    if (activeCategory !== 'all') {
      results = results.filter(
        (h) => h.category?.toLowerCase() === activeCategory
      );
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (h) =>
          h.name?.toLowerCase().includes(term) ||
          h.location?.toLowerCase().includes(term) ||
          h.city_slug?.includes(term)
      );
    }
    return results;
  }, [hotels, activeCategory, searchTerm]);

  useEffect(() => {
    setVisibleCount(HOTELS_PER_PAGE);
  }, [activeCategory, searchTerm]);

  const visibleHotels = filteredHotels.slice(0, visibleCount);

  return (
    <div className='min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-20'>
      {/* NAVBAR */}
      <nav className='sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200'>
        <div className='max-w-7xl mx-auto px-6 h-20 flex items-center justify-between'>
          <div
            className='flex items-center gap-2 cursor-pointer'
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className='w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-serif font-bold shadow-lg shadow-black/20'>
              H
            </div>
            <span className='font-serif text-xl font-bold tracking-tight'>
              HospedaSuite
            </span>
          </div>
          <button
            onClick={() => navigate('/soy-hotelero')}
            className='text-sm font-bold text-slate-600 hover:text-black transition-colors'
          >
            Soy Hotelero
          </button>
        </div>
      </nav>

      {/* HERO & BUSCADOR */}
      <div className='relative pt-12 pb-8 px-6'>
        <div className='max-w-4xl mx-auto text-center mb-10'>
          <h1 className='text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-4'>
            Encuentra tu próximo refugio
          </h1>
          <p className='text-slate-500 text-lg font-light'>
            Explora los mejores hoteles, glampings y experiencias.
          </p>
        </div>

        <div className='sticky top-24 z-40 max-w-2xl mx-auto'>
          <div className='bg-white/90 backdrop-blur-md rounded-full shadow-2xl shadow-slate-300/50 p-2 flex items-center border border-white/50 ring-1 ring-slate-100 transform transition-transform hover:scale-[1.01]'>
            <div className='pl-6 pr-2 text-slate-400'>
              <Search size={20} />
            </div>
            <input
              type='text'
              // ✅ CORRECCIÓN VISUAL: Texto corto para que no se corte en iPhone SE
              placeholder='Buscar destino...'
              className='flex-1 bg-transparent border-none outline-none text-slate-800 font-medium placeholder:text-slate-400 h-12 text-lg'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className='bg-black text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors'>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        {/* FILTROS RESPONSIVE (NO SE CORTAN) */}
        <div className='mt-12 flex justify-start md:justify-center gap-4 overflow-x-auto pb-4 px-6 scrollbar-hide'>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${
                activeCategory === cat.id
                  ? 'bg-black text-white border-black shadow-lg scale-105'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <cat.icon size={16} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRID RESULTADOS */}
      <div className='max-w-7xl mx-auto px-6 mt-4 min-h-[50vh]'>
        {loading ? (
          <div className='flex justify-center py-20'>
            <div className='animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent'></div>
          </div>
        ) : visibleHotels.length > 0 ? (
          <>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8'>
              <AnimatePresence mode='popLayout'>
                {visibleHotels.map((hotel) => (
                  // ✅ CORRECCIÓN TÉCNICA: motion.div wrapper para evitar error de refs
                  <motion.div
                    key={hotel.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <HotelCard hotel={hotel} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {visibleCount < filteredHotels.length && (
              <div className='flex justify-center mt-16 pb-10'>
                <button
                  onClick={() =>
                    setVisibleCount((prev) => prev + HOTELS_PER_PAGE)
                  }
                  className='group flex items-center gap-2 px-8 py-4 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-600 hover:text-black hover:border-black hover:shadow-xl transition-all'
                >
                  <Plus
                    size={16}
                    className='group-hover:rotate-90 transition-transform duration-300'
                  />
                  Mostrar más alojamientos
                </button>
              </div>
            )}
          </>
        ) : (
          <div className='text-center py-20 opacity-50'>
            <Tent
              size={64}
              className='mx-auto mb-6 text-slate-200'
            />
            <h3 className='text-2xl font-serif font-bold text-slate-400'>
              Sin resultados
            </h3>
            <p className='text-slate-400'>
              Intenta buscar otra ciudad o categoría.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
