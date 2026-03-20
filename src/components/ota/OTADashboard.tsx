'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  Tent,
  Building2,
  Home,
  Castle,
  Plus,
  Search,
  UserLock,
  Loader2,
} from 'lucide-react';
import HotelCard from './HotelCard';
import Link from 'next/link';
import { fetchOTAHotelsAction } from '@/app/actions/ota';

// CATEGORÍAS
const CATEGORIES = [
  { id: 'all', label: 'Todo', icon: SlidersHorizontal },
  { id: 'glamping', label: 'Glamping', icon: Tent },
  { id: 'hotel', label: 'Hoteles', icon: Building2 },
  { id: 'cabin', label: 'Cabañas', icon: Home },
  { id: 'boutique', label: 'Boutique', icon: Castle },
];

interface OTADashboardProps {
  initialHotels: any[];
  initialHasMore?: boolean;
}

export default function OTADashboard({
  initialHotels,
  initialHasMore = false,
}: OTADashboardProps) {
  // ESTADOS DE PAGINACIÓN Y DATOS
  const [hotels, setHotels] = useState(initialHotels);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // ESTADOS DE UI (Filtros)
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 🚨 EFECTO DE BÚSQUEDA REMOTA BLINDADO (Debounce + Anti-Race Condition)
  useEffect(() => {
    if (activeCategory === 'all' && searchTerm === '' && page === 0 && hotels === initialHotels) return;

    let isMounted = true; // 🚨 Bandera de control para redes lentas

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      
      const response = await fetchOTAHotelsAction(0, 24, activeCategory, searchTerm);
      
      // 🚨 Solo actualizamos el estado si esta fue la ÚLTIMA petición disparada
      if (isMounted) {
        if (response.success) {
          setHotels(response.data);
          setPage(0);
          setHasMore(response.hasMore);
        }
        setIsSearching(false);
      }
    }, 500);

    return () => {
      // 🚨 Al cambiar el texto, React ejecuta este return PRIMERO antes de lanzar el nuevo useEffect
      isMounted = false; // Invalidamos la promesa anterior para que no sobrescriba los datos
      clearTimeout(delayDebounceFn);
    };
  }, [searchTerm, activeCategory]);

  // FUNCIÓN PARA CARGAR MÁS DESDE EL SERVIDOR
  const loadMoreHotels = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    
    const nextPage = page + 1;
    const response = await fetchOTAHotelsAction(nextPage, 24, activeCategory, searchTerm);
    
    if (response.success) {
      setHotels((prev) => [...prev, ...response.data]);
      setPage(nextPage);
      setHasMore(response.hasMore);
    } else {
      alert('Error cargando más alojamientos.');
    }
    
    setIsLoadingMore(false);
  };

  return (
    <div className='min-h-screen bg-hospeda-50 flex flex-col font-sans text-hospeda-950'>
      {/* HEADER */}
      <header className='sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-hospeda-100'>
        <div className='max-w-7xl mx-auto px-4 h-20 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='relative w-10 h-10'>
              <div className='w-full h-full bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold'>
                H
              </div>
            </div>
            <span className='text-xl font-display font-bold text-hospeda-900 tracking-wider'>
              HOSPEDA<span className='text-hospeda-500'>SUITE</span>
            </span>
          </div>

          <Link
            href='/software'
            className='flex items-center gap-2 text-xs font-bold text-hospeda-600 bg-hospeda-50 px-4 py-2 rounded-full hover:bg-hospeda-100 transition-colors border border-hospeda-200'
          >
            <UserLock size={14} />
            <span>ACCESO HOTELERO</span>
          </Link>
        </div>
      </header>

      <main className='flex-1 max-w-7xl mx-auto px-4 py-8 w-full'>
        {/* HERO SEARCH SECTION */}
        <div className='mb-12 text-center'>
          <h1 className='text-4xl md:text-6xl font-display font-bold text-hospeda-900 mb-6'>
            Encuentra tu lugar{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-hospeda-500 to-cyan-400'>
              seguro
            </span>
          </h1>

          {/* Barra de Búsqueda */}
          <div className='max-w-2xl mx-auto relative group'>
            <div className='absolute inset-0 bg-gradient-to-r from-hospeda-400 to-cyan-400 rounded-full blur opacity-20 group-hover:opacity-30 transition-opacity' />
            <div className='relative bg-white rounded-full shadow-xl flex items-center p-2 border border-hospeda-100'>
              <div className='pl-4 text-hospeda-400'>
                <Search size={20} />
              </div>
              <input
                type='text'
                placeholder='¿A dónde quieres escapar hoy?'
                className='w-full bg-transparent border-none focus:ring-0 text-hospeda-900 placeholder:text-hospeda-300 px-4 h-10 outline-none'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className='bg-hospeda-900 text-white px-6 py-2 rounded-full font-medium hover:bg-hospeda-800 transition-colors'>
                Buscar
              </button>
            </div>
          </div>
        </div>

        {/* FILTROS DE CATEGORÍA */}
        <div className='flex flex-wrap justify-center gap-3 mb-12'>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                activeCategory === cat.id
                  ? 'bg-hospeda-900 text-white shadow-lg scale-105'
                  : 'bg-white text-hospeda-600 hover:bg-hospeda-50 border border-hospeda-100'
              }`}
            >
              <cat.icon size={16} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* GRID DE HOTELES */}
        {isSearching ? (
          <div className='flex flex-col items-center justify-center py-20 text-hospeda-400'>
            <Loader2 size={48} className='animate-spin mb-4 text-hospeda-500' />
            <p className='font-bold'>Buscando destinos...</p>
          </div>
        ) : hotels.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8'>
            <AnimatePresence mode='popLayout'>
              {hotels.map((hotel) => (
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
              size={64}
              className='mx-auto mb-4 text-hospeda-300'
            />
            <h3 className='text-xl font-bold text-hospeda-400'>
              Sin resultados
            </h3>
            <p>Intenta ajustar tu búsqueda o limpiar los filtros.</p>
          </div>
        )}

        {/* BOTÓN CARGAR MÁS CONECTADO AL SERVIDOR */}
        {hasMore && !isSearching && (
          <div className='flex justify-center mt-16 mb-20'>
            <button
              onClick={loadMoreHotels}
              disabled={isLoadingMore}
              className='flex items-center gap-2 px-8 py-4 bg-white border border-hospeda-200 rounded-full text-hospeda-600 font-bold hover:shadow-xl hover:bg-hospeda-50 transition-all disabled:opacity-50'
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={16} className='animate-spin text-hospeda-600' /> 
                  Cargando destinos...
                </>
              ) : (
                <>
                  <Plus size={16} /> Mostrar más alojamientos
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}