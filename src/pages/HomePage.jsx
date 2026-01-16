import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import HotelCard from '../components/ota/HotelCard';
import { useNavigate } from 'react-router-dom';

// CATEGORÍAS PARA FILTROS
const CATEGORIES = [
  { id: 'all', label: 'Todo', icon: SlidersHorizontal },
  { id: 'glamping', label: 'Glamping', icon: Tent },
  { id: 'hotel', label: 'Hoteles', icon: Building2 },
  { id: 'cabin', label: 'Cabañas', icon: Home },
  { id: 'boutique', label: 'Boutique', icon: Castle },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState([]);
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS DE FILTRO
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. CARGA DE DATOS (READ-ONLY DESDE PMS)
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        // Solo traemos hoteles ACTIVOS
        const { data, error } = await supabase
          .from('hotels')
          .select('*')
          .eq('status', 'active')
          .order('min_price', { ascending: true }); // Ordenar por precio base

        if (error) throw error;
        setHotels(data || []);
        setFilteredHotels(data || []);
      } catch (error) {
        console.error('Error cargando OTA:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHotels();
  }, []);

  // 2. MOTOR DE FILTRADO EN TIEMPO REAL
  useEffect(() => {
    let results = hotels;

    // Filtro por Categoría
    if (activeCategory !== 'all') {
      results = results.filter(
        (h) => h.category?.toLowerCase() === activeCategory
      );
    }

    // Filtro por Búsqueda (Ciudad o Nombre)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (h) =>
          h.name.toLowerCase().includes(term) ||
          h.location?.toLowerCase().includes(term) ||
          h.city_slug?.includes(term)
      );
    }

    setFilteredHotels(results);
  }, [activeCategory, searchTerm, hotels]);

  return (
    <div className='min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-20'>
      {/* --- HEADER / NAVBAR --- */}
      <nav className='sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200'>
        <div className='max-w-7xl mx-auto px-6 h-20 flex items-center justify-between'>
          {/* Logo */}
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-serif font-bold'>
              H
            </div>
            <span className='font-serif text-xl font-bold tracking-tight'>
              HospedaSuite
            </span>
          </div>

          {/* Menú Hotelero (Vínculo a la antigua Landing) */}
          <button
            onClick={() => navigate('/soy-hotelero')}
            className='text-sm font-bold text-slate-600 hover:text-black transition-colors'
          >
            Soy Hotelero
          </button>
        </div>
      </nav>

      {/* --- HERO SEARCH SECTION --- */}
      <div className='relative pt-12 pb-8 px-6'>
        <div className='max-w-4xl mx-auto text-center mb-10'>
          <h1 className='text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-4'>
            Encuentra tu próximo refugio
          </h1>
          <p className='text-slate-500 text-lg'>
            Explora los mejores hoteles, glampings y experiencias.
          </p>
        </div>

        {/* SEARCH BAR FLOTANTE (MAC 2026) */}
        <div className='sticky top-24 z-40 max-w-2xl mx-auto'>
          <div className='bg-white rounded-full shadow-2xl shadow-slate-200/50 p-2 flex items-center border border-slate-100 transform transition-transform hover:scale-[1.01]'>
            <div className='pl-6 pr-2 text-slate-400'>
              <Search size={20} />
            </div>
            <input
              type='text'
              placeholder='¿A dónde quieres ir? (Ej: Villa de Leyva)'
              className='flex-1 bg-transparent border-none outline-none text-slate-800 font-medium placeholder:text-slate-400 h-12'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <button className='bg-black text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors'>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        {/* CATEGORY TABS (SCROLL HORIZONTAL) */}
        <div className='mt-12 flex justify-center gap-4 overflow-x-auto pb-4 scrollbar-hide'>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-black text-white shadow-lg scale-105'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <cat.icon size={16} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- RESULTS GRID --- */}
      <div className='max-w-7xl mx-auto px-6 mt-4'>
        {loading ? (
          <div className='flex justify-center py-20'>
            <div className='animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent'></div>
          </div>
        ) : filteredHotels.length > 0 ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8'>
            <AnimatePresence>
              {filteredHotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className='text-center py-20 opacity-50'>
            <Tent
              size={48}
              className='mx-auto mb-4 text-slate-300'
            />
            <h3 className='text-xl font-bold'>
              No encontramos alojamientos aquí
            </h3>
            <p>Intenta buscar otra ciudad o categoría.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
