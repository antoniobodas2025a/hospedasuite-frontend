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
import LanguageSwitcher from './LanguageSwitcher';
import Link from 'next/link';
import { fetchOTAHotelsAction } from '@/app/actions/ota';
import { useTranslations } from 'next-intl';

const CATEGORIES = [
  { id: 'all', labelKey: 'ota.categories.all', icon: SlidersHorizontal },
  { id: 'glamping', labelKey: 'ota.categories.glamping', icon: Tent },
  { id: 'hotel', labelKey: 'ota.categories.hotels', icon: Building2 },
  { id: 'cabin', labelKey: 'ota.categories.cabins', icon: Home },
  { id: 'boutique', labelKey: 'ota.categories.boutique', icon: Castle },
];

interface OTADashboardProps {
  initialHotels: any[];
  initialHasMore?: boolean;
}

export default function OTADashboard({
  initialHotels,
  initialHasMore = false,
}: OTADashboardProps) {
  const t = useTranslations();
  const [hotels, setHotels] = useState(initialHotels);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    if (activeCategory === 'all' && searchTerm === '' && page === 0 && hotels === initialHotels) return;

    let isMounted = true;

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);

      const response = await fetchOTAHotelsAction(0, 24, activeCategory, searchTerm);

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
      isMounted = false;
      clearTimeout(delayDebounceFn);
    };
  }, [searchTerm, activeCategory]);

  // Scroll handler: hide header on scroll down, show on scroll up
  useEffect(() => {
    let lastScrollY = 0;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // Hide when scrolling down past 80px, show when scrolling up
          if (currentScrollY > 80) {
            setIsHeaderVisible(currentScrollY < lastScrollY);
          } else {
            setIsHeaderVisible(true);
          }
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      alert('Error cargando mas alojamientos.');
    }

    setIsLoadingMore(false);
  };

  return (
    <div className='min-h-screen bg-background flex flex-col font-sans text-foreground'>
      {/* HEADER */}
      <header className={`fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border !rounded-none transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className='max-w-7xl mx-auto px-4 h-20 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='relative w-10 h-10'>
              <div className='w-full h-full bg-brand-600 rounded-[var(--radius-squircle-md)] flex items-center justify-center text-primary-foreground font-bold'>
                H
              </div>
            </div>
            <span className='text-xl font-display font-bold text-foreground tracking-wider'>
              {t('ota.header.brand')}<span className='text-brand-500'>{t('ota.header.brandAccent')}</span>
            </span>
          </div>

          <div className='flex items-center gap-3'>
            <LanguageSwitcher />
            <Link
              href='/software'
              className='flex items-center gap-2 text-xs font-bold text-brand-600 bg-brand-50 px-4 py-2 rounded-full hover:bg-brand-100 transition-colors border border-brand-200'
            >
              <UserLock size={14} />
              <span>{t('ota.header.hotelAccess')}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className='flex-1 max-w-7xl mx-auto px-4 pt-28 pb-8 w-full'>
        {/* HERO SECTION */}
        <div className='text-center mb-8'>
          <h1 className='text-4xl md:text-6xl font-display font-bold text-foreground mb-6'>
            {t('ota.hero.title')}{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-warm-400'>
              {t('ota.hero.highlight')}
            </span>
          </h1>
        </div>

        {/* SEARCH BAR — sticky: stays below header, moves to top-0 when header hides */}
        <div className={`sticky z-40 mb-12 transition-[top] duration-300 ${isHeaderVisible ? 'top-20' : 'top-0'}`}>
          <div className='max-w-2xl mx-auto relative group'>
            <div className='absolute inset-0 bg-gradient-to-r from-brand-400 to-warm-400 rounded-full blur opacity-20 group-hover:opacity-30 transition-opacity' />
            <div className='relative bg-card rounded-full shadow-xl flex items-center p-2 border border-border'>
              <div className='pl-4 text-brand-500'>
                <Search size={20} />
              </div>
              <input
                type='text'
                placeholder={t('ota.search.placeholder')}
                className='w-full bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/50 px-4 h-10 outline-none'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className='bg-foreground text-background px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors'>
                {t('ota.search.button')}
              </button>
            </div>
          </div>
        </div>

        {/* FILTROS DE CATEGORIA */}
        <div className='flex flex-wrap justify-center gap-3 mb-12'>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                activeCategory === cat.id
                  ? 'bg-foreground text-background shadow-lg scale-105'
                  : 'bg-card text-brand-600 hover:bg-accent border border-border'
              }`}
            >
              <cat.icon size={16} />
              {t(cat.labelKey)}
            </button>
          ))}
        </div>

        {/* GRID DE HOTELES */}
        {isSearching ? (
          <div className='flex flex-col items-center justify-center py-20 text-muted-foreground'>
            <Loader2 size={48} className='animate-spin mb-4 text-brand-500' />
            <p className='font-bold'>{t('ota.loading.searching')}</p>
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
              className='mx-auto mb-4 text-brand-300'
            />
            <h3 className='text-xl font-bold text-muted-foreground'>
              {t('ota.noResults.title')}
            </h3>
            <p>{t('ota.noResults.description')}</p>
          </div>
        )}

        {/* BOTON CARGAR MAS */}
        {hasMore && !isSearching && (
          <div className='flex justify-center mt-16 mb-20'>
            <button
              onClick={loadMoreHotels}
              disabled={isLoadingMore}
              className='flex items-center gap-2 px-8 py-4 bg-card border border-border rounded-full text-brand-600 font-bold hover:shadow-xl hover:bg-accent transition-all disabled:opacity-50'
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={16} className='animate-spin text-brand-600' />
                  {t('ota.loading.loadingMore')}
                </>
              ) : (
                <>
                  <Plus size={16} /> {t('ota.loadMore')}
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
