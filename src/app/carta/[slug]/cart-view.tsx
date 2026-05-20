/**
 * CartView — Public Menu Component
 *
 * Client component that renders the public-facing digital menu.
 * Features:
 * - Bilingual display (ES/EN) with language toggle
 * - Category filtering
 * - Featured items section
 * - Item detail modal
 * - Table number display (from QR scan)
 * - Mobile-first responsive design
 */

'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, Clock, Flame, AlertTriangle, Star,
  ChevronDown, X, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MenuCategoryDTO, MenuItemDTO } from '@/data/carta-digital'
import type { HotelDTO } from '@/data/hotels'

interface CartViewProps {
  hotel: HotelDTO
  categories: MenuCategoryDTO[]
  items: MenuItemDTO[]
  featured: MenuItemDTO[]
  tableNumber: string | null
  language: 'es' | 'en'
}

export function CartView({
  hotel,
  categories,
  items,
  featured,
  tableNumber,
  language: initialLang,
}: CartViewProps) {
  const [lang, setLang] = useState<'es' | 'en'>(initialLang)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<MenuItemDTO | null>(null)

  const t = useMemo(() => ({
    featured: lang === 'es' ? 'Destacados' : 'Featured',
    menu: lang === 'es' ? 'Menú' : 'Menu',
    all: lang === 'es' ? 'Todo' : 'All',
    unavailable: lang === 'es' ? 'No disponible' : 'Unavailable',
    ingredients: lang === 'es' ? 'Ingredientes y alérgenos' : 'Ingredients & Allergens',
    prepTime: lang === 'es' ? 'Tiempo de preparación' : 'Preparation time',
    calories: lang === 'es' ? 'Calorías' : 'Calories',
    close: lang === 'es' ? 'Cerrar' : 'Close',
    table: lang === 'es' ? 'Mesa' : 'Table',
    poweredBy: lang === 'es' ? 'Con tecnología de' : 'Powered by',
    minutes: lang === 'es' ? 'min' : 'min',
  }), [lang])

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items
    return items.filter(item => item.category_id === activeCategory)
  }, [items, activeCategory])

  const getName = (es: string, en: string | null) => en && lang === 'en' ? en : es
  const getDescription = (es: string | null, en: string | null) => {
    if (lang === 'en' && en) return en
    return es || ''
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">{hotel.name}</h1>
            {tableNumber && (
              <p className="text-xs text-muted-foreground">
                {t.table}: {tableNumber}
              </p>
            )}
          </div>
          <button
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Globe className="size-3.5" />
            {lang === 'es' ? 'ES' : 'EN'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-24">
        {/* Featured Section */}
        {featured.length > 0 && (
          <section className="py-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Star className="size-4 text-amber-400 fill-amber-400" />
              {t.featured}
            </h2>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {featured.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="flex-shrink-0 w-40 bg-card border border-border rounded-xl overflow-hidden group"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={getName(item.name, item.name_en)}
                      className="w-full h-28 object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-28 bg-muted flex items-center justify-center text-3xl">
                      🍽️
                    </div>
                  )}
                  <div className="p-3 text-left">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {getName(item.name, item.name_en)}
                    </p>
                    <p className="text-xs font-mono text-emerald-400 mt-1">
                      ${item.price.toLocaleString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Category Filter */}
        {categories.length > 0 && (
          <section className="py-4 sticky top-14 z-30 bg-background/80 backdrop-blur-xl -mx-4 px-4">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  activeCategory === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {t.all}
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    activeCategory === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {getName(cat.name, cat.name_en)}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Menu Items */}
        <section className="py-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
            {t.menu}
          </h2>
          <div className="space-y-3">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => item.is_available && setSelectedItem(item)}
                disabled={!item.is_available}
                className={cn(
                  'w-full flex gap-4 p-4 bg-card border border-border rounded-xl text-left transition-colors',
                  item.is_available
                    ? 'hover:border-indigo-500/30 active:bg-accent'
                    : 'opacity-50 cursor-not-allowed'
                )}
              >
                {/* Image */}
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={getName(item.name, item.name_en)}
                    className="size-20 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="size-20 rounded-lg bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                    🍽️
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {getName(item.name, item.name_en)}
                    </h3>
                    {item.is_featured && (
                      <Star className="size-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {getDescription(item.description, item.description_en)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      ${item.price.toLocaleString()}
                    </span>
                    {item.preparation_time_min && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="size-3" />
                        {item.preparation_time_min} {t.minutes}
                      </span>
                    )}
                    {item.calories && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Flame className="size-3" />
                        {item.calories} kcal
                      </span>
                    )}
                  </div>
                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 bg-indigo-600/10 text-indigo-400 rounded"
                        >
                          {tag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                  {!item.is_available && (
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {t.unavailable}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border py-3">
        <p className="text-center text-[10px] text-muted-foreground">
          {t.poweredBy}{' '}
          <span className="font-semibold text-foreground">HospedaSuite</span>
        </p>
      </footer>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto"
            >
              {/* Image */}
              {selectedItem.image_url ? (
                <img
                  src={selectedItem.image_url}
                  alt={getName(selectedItem.name, selectedItem.name_en)}
                  className="w-full h-56 object-cover"
                />
              ) : (
                <div className="w-full h-56 bg-muted flex items-center justify-center text-6xl">
                  🍽️
                </div>
              )}

              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {getName(selectedItem.name, selectedItem.name_en)}
                    </h2>
                    {selectedItem.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {getDescription(selectedItem.description, selectedItem.description_en)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-2 bg-muted rounded-full hover:bg-accent transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Price */}
                <p className="text-2xl font-mono font-bold text-emerald-400">
                  ${selectedItem.price.toLocaleString()} COP
                </p>

                {/* Meta info */}
                <div className="flex gap-4">
                  {selectedItem.preparation_time_min && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="size-4" />
                      {selectedItem.preparation_time_min} {t.minutes}
                    </div>
                  )}
                  {selectedItem.calories && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Flame className="size-4" />
                      {selectedItem.calories} kcal
                    </div>
                  )}
                </div>

                {/* Tags */}
                {selectedItem.tags && selectedItem.tags.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {lang === 'es' ? 'Etiquetas' : 'Tags'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-indigo-600/10 text-indigo-400 rounded-md"
                        >
                          {tag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergens */}
                {selectedItem.allergens && selectedItem.allergens.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-rose-400 mb-2 flex items-center gap-1">
                      <AlertTriangle className="size-3" />
                      {t.ingredients}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.allergens.map(a => (
                        <span
                          key={a}
                          className="text-xs px-2 py-1 bg-rose-600/10 text-rose-400 rounded-md"
                        >
                          {a.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
