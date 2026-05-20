'use client';

import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const [currentLocale, setCurrentLocale] = useState('es');

  useEffect(() => {
    // Leer cookie actual
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]*)/);
    setCurrentLocale(match?.[1] || 'es');
  }, []);

  const switchLanguage = (locale: 'es' | 'en') => {
    // Guardar cookie
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    setCurrentLocale(locale);
    // Recargar para aplicar el nuevo idioma
    window.location.reload();
  };

  return (
    <div className='flex items-center gap-1 bg-white/5 backdrop-blur-sm rounded-full px-1 py-1 border border-white/10'>
      <Globe size={14} className='text-muted-foreground ml-1' />
      <button
        onClick={() => switchLanguage('es')}
        className={`px-2 py-1 rounded-full text-xs font-bold transition-all ${
          currentLocale === 'es'
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        ES
      </button>
      <button
        onClick={() => switchLanguage('en')}
        className={`px-2 py-1 rounded-full text-xs font-bold transition-all ${
          currentLocale === 'en'
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        EN
      </button>
    </div>
  );
}
