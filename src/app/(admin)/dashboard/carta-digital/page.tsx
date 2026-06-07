/**
 * Carta Digital — Admin Page
 *
 * Full CRUD for managing the hotel's digital menu:
 * - Categories (create, edit, delete, reorder)
 * - Menu items (create, edit, delete, feature, toggle availability)
 * - QR codes (generate per table/room, download, track scans)
 * - Analytics (views, popular items, table breakdown)
 *
 * Plan gating: Pro+ required (enforced by server action).
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit2, Trash2, QrCode, BarChart3,
  UtensilsCrossed, Tag, Eye, Download, Copy,
  ChevronUp, ChevronDown, Star, StarOff,
  ToggleLeft, ToggleRight, X, Save, AlertTriangle,
  Sparkles, Coffee, Wine, Cake, Soup, Fish, Beef,
  
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'
import {
  getCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  getMenuItemsAction,
  createMenuItemAction,
  updateMenuItemAction,
  deleteMenuItemAction,
  getQRCodesAction,
  createQRCodeAction,
  deleteQRCodeAction,
  getCartaAnalyticsAction,
  getCartaHotelSlugAction,
} from '@/app/actions/carta-digital'
import type { MenuCategoryDTO, MenuItemDTO, QRCodeDTO } from '@/data/carta-digital'

// ─── Tab Types ────────────────────────────────────────────────

type TabId = 'items' | 'categories' | 'qr' | 'analytics'

interface Tab {
  id: TabId
  label: string
  icon: React.ElementType
}

const TABS: Tab[] = [
  { id: 'items', label: 'Platos & Bebidas', icon: UtensilsCrossed },
  { id: 'categories', label: 'Categorías', icon: Tag },
  { id: 'qr', label: 'Códigos QR', icon: QrCode },
  { id: 'analytics', label: 'Analíticas', icon: BarChart3 },
]

const ITEM_ICONS = [
  { emoji: '☕', label: 'Café' },
  { emoji: '🍺', label: 'Cerveza' },
  { emoji: '🍷', label: 'Vino' },
  { emoji: '🥗', label: 'Ensalada' },
  { emoji: '🍔', label: 'Hamburguesa' },
  { emoji: '🍕', label: 'Pizza' },
  { emoji: '🍰', label: 'Postre' },
  { emoji: '🥩', label: 'Carne' },
  { emoji: '🐟', label: 'Pescado' },
  { emoji: '🍝', label: 'Pasta' },
  { emoji: '🥤', label: 'Bebida' },
  { emoji: '🧊', label: 'Agua' },
]

const ALLERGEN_OPTIONS = [
  'gluten', 'lacteos', 'huevos', 'frutos_secos', 'soja',
  'mariscos', 'pescado', 'apio', 'mostaza', 'sesamo',
  'sulfitos', 'altramuces', 'moluscos',
]

const TAG_OPTIONS = [
  'vegetariano', 'vegano', 'sin_gluten', 'sin_lactosa',
  'picante', 'organico', 'artesanal', 'bajo_en_calorias',
  'alto_en_proteina', 'kids_friendly',
]

// ─── Main Page Component ──────────────────────────────────────

export default function CartaDigitalPage() {
  const [activeTab, setActiveTab] = useState<TabId>('items')
  const [categories, setCategories] = useState<MenuCategoryDTO[]>([])
  const [items, setItems] = useState<MenuItemDTO[]>([])
  const [qrCodes, setQRCodes] = useState<QRCodeDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [catRes, itemsRes, qrRes] = await Promise.all([
        getCategoriesAction(),
        getMenuItemsAction(),
        getQRCodesAction(),
      ])

      if (catRes.success) setCategories(catRes.categories || [])
      if (itemsRes.success) setItems(itemsRes.items || [])
      if (qrRes.success) setQRCodes(qrRes.codes || [])

      // Check for plan gating error
      const firstError = [catRes, itemsRes, qrRes].find(r => !r.success)
      if (firstError) setError(firstError.error || 'Error desconocido')
    } catch (err) {
      setError('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <AlertTriangle className="size-16 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Acceso Restringido</h2>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <p className="text-sm text-muted-foreground mt-4">
          La Carta Digital está disponible desde el Plan Pro.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="size-6 text-indigo-400" />
            Carta Digital
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestioná tu menú digital, códigos QR y analíticas
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'items' && (
            <ItemsTab
              items={items}
              categories={categories}
              onRefresh={loadData}
            />
          )}
          {activeTab === 'categories' && (
            <CategoriesTab
              categories={categories}
              onRefresh={loadData}
            />
          )}
          {activeTab === 'qr' && (
            <QRTab
              qrCodes={qrCodes}
              onRefresh={loadData}
            />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsTab />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Items Tab ────────────────────────────────────────────────

function ItemsTab({
  items,
  categories,
  onRefresh,
}: {
  items: MenuItemDTO[]
  categories: MenuCategoryDTO[]
  onRefresh: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItemDTO | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    name_en: '',
    description: '',
    description_en: '',
    price: 0,
    category_id: '',
    image_url: '',
    is_available: true,
    is_featured: false,
    tags: [] as string[],
    allergens: [] as string[],
    preparation_time_min: null as number | null,
    calories: null as number | null,
  })

  const resetForm = () => {
    setForm({
      name: '', name_en: '', description: '', description_en: '',
      price: 0, category_id: '', image_url: '', is_available: true,
      is_featured: false, tags: [], allergens: [],
      preparation_time_min: null, calories: null,
    })
    setEditingItem(null)
    setShowForm(false)
  }

  const handleEdit = (item: MenuItemDTO) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      name_en: item.name_en || '',
      description: item.description || '',
      description_en: item.description_en || '',
      price: item.price,
      category_id: item.category_id || '',
      image_url: item.image_url || '',
      is_available: item.is_available,
      is_featured: item.is_featured,
      tags: item.tags || [],
      allergens: item.allergens || [],
      preparation_time_min: item.preparation_time_min,
      calories: item.calories,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || form.price <= 0) return
    setSaving(true)

    try {
      const input = {
        name: form.name,
        name_en: form.name_en || undefined,
        description: form.description || undefined,
        description_en: form.description_en || undefined,
        price: form.price,
        category_id: form.category_id || undefined,
        image_url: form.image_url || undefined,
        is_available: form.is_available,
        is_featured: form.is_featured,
        tags: form.tags.length > 0 ? form.tags : undefined,
        allergens: form.allergens.length > 0 ? form.allergens : undefined,
        preparation_time_min: form.preparation_time_min ?? undefined,
        calories: form.calories ?? undefined,
      }

      if (editingItem) {
        await updateMenuItemAction(editingItem.id, input)
      } else {
        await createMenuItemAction(input)
      }
      resetForm()
      onRefresh()
    } catch {
      // Error handled by action
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este plato?')) return
    await deleteMenuItemAction(id)
    onRefresh()
  }

  const toggleTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  const toggleAllergen = (allergen: string) => {
    setForm(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen],
    }))
  }

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Sin categoría'
    return categories.find(c => c.id === categoryId)?.name || 'Sin categoría'
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <button
        onClick={() => { resetForm(); setShowForm(true) }}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-colors"
      >
        <Plus className="size-4" />
        Nuevo Plato
      </button>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-foreground">
                  {editingItem ? 'Editar Plato' : 'Nuevo Plato'}
                </h3>
                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre (ES)</label>
                    <input
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="Ej: Bandeja Paisa"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Name (EN)</label>
                    <input
                      value={form.name_en}
                      onChange={e => setForm(prev => ({ ...prev, name_en: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="Ej: Paisa Platter"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                      rows={2}
                      placeholder="Descripción del plato..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                    <textarea
                      value={form.description_en}
                      onChange={e => setForm(prev => ({ ...prev, description_en: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                      rows={2}
                      placeholder="English description..."
                    />
                  </div>
                </div>

                {/* Price & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Precio (COP)</label>
                    <input
                      type="number"
                      value={form.price || ''}
                      onChange={e => setForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-emerald-400 font-mono outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="25000"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
                    <select
                      value={form.category_id}
                      onChange={e => setForm(prev => ({ ...prev, category_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">URL de imagen</label>
                  <input
                    value={form.image_url}
                    onChange={e => setForm(prev => ({ ...prev, image_url: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="https://..."
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Etiquetas</label>
                  <div className="flex flex-wrap gap-2">
                    {TAG_OPTIONS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          'px-2 py-1 rounded-md text-xs font-medium border transition-colors',
                          form.tags.includes(tag)
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                            : 'bg-background border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {tag.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Allergens */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Alérgenos</label>
                  <div className="flex flex-wrap gap-2">
                    {ALLERGEN_OPTIONS.map(a => (
                      <button
                        key={a}
                        onClick={() => toggleAllergen(a)}
                        className={cn(
                          'px-2 py-1 rounded-md text-xs font-medium border transition-colors',
                          form.allergens.includes(a)
                            ? 'bg-rose-600/20 border-rose-500 text-rose-400'
                            : 'bg-background border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {a.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prep time & calories */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tiempo prep. (min)</label>
                    <input
                      type="number"
                      value={form.preparation_time_min || ''}
                      onChange={e => setForm(prev => ({ ...prev, preparation_time_min: parseInt(e.target.value) || null }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Calorías</label>
                    <input
                      type="number"
                      value={form.calories || ''}
                      onChange={e => setForm(prev => ({ ...prev, calories: parseInt(e.target.value) || null }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="450"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex gap-6">
                  <button
                    onClick={() => setForm(prev => ({ ...prev, is_available: !prev.is_available }))}
                    className="flex items-center gap-2 text-sm"
                  >
                    {form.is_available ? <ToggleRight className="size-5 text-emerald-400" /> : <ToggleLeft className="size-5 text-muted-foreground" />}
                    <span className={form.is_available ? 'text-emerald-400' : 'text-muted-foreground'}>
                      Disponible
                    </span>
                  </button>
                  <button
                    onClick={() => setForm(prev => ({ ...prev, is_featured: !prev.is_featured }))}
                    className="flex items-center gap-2 text-sm"
                  >
                    {form.is_featured ? <Star className="size-5 text-amber-400" /> : <StarOff className="size-5 text-muted-foreground" />}
                    <span className={form.is_featured ? 'text-amber-400' : 'text-muted-foreground'}>
                      Destacado
                    </span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || form.price <= 0}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-muted disabled:text-muted-foreground text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="size-4" />
                  {saving ? 'Guardando...' : editingItem ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Coffee className="size-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No hay platos todavía</p>
          <p className="text-sm mt-1">Creá tu primer plato para empezar</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map(item => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-4 p-4 bg-card border border-border rounded-xl transition-colors',
                !item.is_available && 'opacity-50'
              )}
            >
              {/* Image or placeholder */}
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="size-16 rounded-lg object-cover"
                />
              ) : (
                <div className="size-16 rounded-lg bg-muted flex items-center justify-center text-2xl">
                  🍽️
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-foreground truncate">{item.name}</h4>
                  {item.is_featured && <Star className="size-4 text-amber-400 fill-amber-400" />}
                  {!item.is_available && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">No disponible</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{item.description || getCategoryName(item.category_id)}</p>
                <div className="flex gap-2 mt-1">
                  {item.tags?.slice(0, 3).map(t => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 bg-indigo-600/10 text-indigo-400 rounded">
                      {t.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {item.allergens?.slice(0, 2).map(a => (
                    <span key={a} className="text-[10px] px-1.5 py-0.5 bg-rose-600/10 text-rose-400 rounded">
                      ⚠ {a.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="text-right">
                <p className="font-mono font-bold text-emerald-400">${item.price.toLocaleString()}</p>
                {item.preparation_time_min && (
                  <p className="text-[10px] text-muted-foreground">{item.preparation_time_min} min</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-2 text-muted-foreground hover:text-indigo-400 transition-colors"
                >
                  <Edit2 className="size-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-muted-foreground hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Categories Tab ───────────────────────────────────────────

function CategoriesTab({
  categories,
  onRefresh,
}: {
  categories: MenuCategoryDTO[]
  onRefresh: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MenuCategoryDTO | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', name_en: '', description: '', description_en: '' })

  const resetForm = () => {
    setForm({ name: '', name_en: '', description: '', description_en: '' })
    setEditing(null)
    setShowForm(false)
  }

  const handleEdit = (cat: MenuCategoryDTO) => {
    setEditing(cat)
    setForm({
      name: cat.name,
      name_en: cat.name_en || '',
      description: cat.description || '',
      description_en: cat.description_en || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      if (editing) {
        await updateCategoryAction(editing.id, form)
      } else {
        await createCategoryAction(form)
      }
      resetForm()
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return
    await deleteCategoryAction(id)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => { resetForm(); setShowForm(true) }}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-colors"
      >
        <Plus className="size-4" />
        Nueva Categoría
      </button>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-foreground">
                  {editing ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>
                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre (ES)</label>
                    <input
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="Ej: Entradas"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Name (EN)</label>
                    <input
                      value={form.name_en}
                      onChange={e => setForm(prev => ({ ...prev, name_en: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="Ej: Starters"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción</label>
                    <input
                      value={form.description}
                      onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="Opcional..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                    <input
                      value={form.description_en}
                      onChange={e => setForm(prev => ({ ...prev, description_en: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="Optional..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                <button onClick={resetForm} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-muted disabled:text-muted-foreground text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="size-4" />
                  {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* List */}
      {categories.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Tag className="size-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No hay categorías</p>
          <p className="text-sm mt-1">Creá categorías para organizar tu menú</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl"
            >
              <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                {idx + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{cat.name}</h4>
                {cat.name_en && (
                  <p className="text-xs text-muted-foreground">{cat.name_en}</p>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(cat)} className="p-2 text-muted-foreground hover:text-indigo-400">
                  <Edit2 className="size-4" />
                </button>
                <button onClick={() => handleDelete(cat.id)} className="p-2 text-muted-foreground hover:text-rose-400">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── QR Codes Tab ─────────────────────────────────────────────

function QRTab({
  qrCodes,
  onRefresh,
}: {
  qrCodes: QRCodeDTO[]
  onRefresh: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [tableNumber, setTableNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [hotelSlug, setHotelSlug] = useState<string>('hotel')

  useEffect(() => {
    getCartaHotelSlugAction().then(res => {
      if (res.success && res.slug) setHotelSlug(res.slug)
    })
  }, [])

  const handleCreate = async () => {
    if (!tableNumber.trim()) return
    setSaving(true)
    try {
      const result = await createQRCodeAction({
        table_number: tableNumber.trim(),
        qr_data: '', // Server action generates the URL
      })

      if (result.success) {
        setTableNumber('')
        setShowForm(false)
        onRefresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este código QR?')) return
    await deleteQRCodeAction(id)
    onRefresh()
  }

  const downloadQR = (qrCode: QRCodeDTO) => {
    const svgEl = document.getElementById(`qr-${qrCode.id}`)
    if (!svgEl) return

    const svg = svgEl as unknown as SVGElement

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      const size = 600
      canvas.width = size
      canvas.height = size + 60 // Extra space for label

      // White background
      ctx!.fillStyle = '#ffffff'
      ctx!.fillRect(0, 0, canvas.width, canvas.height)

      // QR code
      ctx!.drawImage(img, 50, 10, size - 100, size - 100)

      // Label
      ctx!.fillStyle = '#1d1d1f'
      ctx!.font = 'bold 20px system-ui'
      ctx!.textAlign = 'center'
      ctx!.fillText(`Mesa ${qrCode.table_number}`, size / 2, size + 35)

      // Download
      const link = document.createElement('a')
      link.download = `qr-mesa-${qrCode.table_number}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-colors"
      >
        <Plus className="size-4" />
        Generar QR para Mesa
      </button>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-foreground">Nuevo Código QR</h3>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Número de Mesa / Habitación</label>
                <input
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Ej: Mesa 1, Habitación 201"
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
                <p className="text-[10px] text-muted-foreground mt-2">
                  URL: /carta/{hotelSlug}?table={tableNumber || '...'}
                </p>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !tableNumber.trim()}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-muted disabled:text-muted-foreground text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <QrCode className="size-4" />
                  {saving ? 'Creando...' : 'Crear QR'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR List */}
      {qrCodes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <QrCode className="size-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No hay códigos QR</p>
          <p className="text-sm mt-1">Generá QRs para cada mesa o habitación</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {qrCodes.map(qr => (
            <div
              key={qr.id}
              className="p-4 bg-card border border-border rounded-xl space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-foreground">{qr.table_number}</h4>
                  <p className="text-xs text-muted-foreground">{qr.scan_count} escaneos</p>
                </div>
                <button
                  onClick={() => handleDelete(qr.id)}
                  className="p-1 text-muted-foreground hover:text-rose-400"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {/* QR Code rendered with qrcode.react */}
              <div className="w-full aspect-square bg-white rounded-lg flex items-center justify-center p-4">
                <QRCodeSVG
                  id={`qr-${qr.id}`}
                  value={qr.qr_data}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => downloadQR(qr)}
                  className="flex-1 py-1.5 text-xs bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Download className="size-3" /> Descargar PNG
                </button>
                <button
                  onClick={() => copyToClipboard(qr.qr_data)}
                  className="flex-1 py-1.5 text-xs bg-muted hover:bg-accent rounded-lg text-foreground transition-colors flex items-center justify-center gap-1"
                >
                  <Copy className="size-3" /> Copiar URL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Analytics Tab ────────────────────────────────────────────

function AnalyticsTab() {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<{
    totalViews: number
    viewsByDay: Array<{ date: string; count: number }>
    popularItems: Array<{ item_id: string; item_name: string; views: number }>
    viewsByTable: Array<{ table_number: string; views: number }>
  } | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await getCartaAnalyticsAction(days)
      if (res.success) setAnalytics(res.analytics || null)
      setLoading(false)
    }
    load()
  }, [days])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin size-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <BarChart3 className="size-12 mx-auto mb-4 opacity-30" />
        <p className="font-medium">No hay datos aún</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time filter */}
      <div className="flex gap-2">
        {[7, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              days === d
                ? 'bg-indigo-600 text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {d} días
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-border rounded-xl">
          <p className="text-xs text-muted-foreground">Vistas Totales</p>
          <p className="text-2xl font-bold text-foreground mt-1">{analytics.totalViews.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-xl">
          <p className="text-xs text-muted-foreground">Platos Populares</p>
          <p className="text-2xl font-bold text-foreground mt-1">{analytics.popularItems.length}</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-xl">
          <p className="text-xs text-muted-foreground">Mesas Activas</p>
          <p className="text-2xl font-bold text-foreground mt-1">{analytics.viewsByTable.length}</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-xl">
          <p className="text-xs text-muted-foreground">Días con Datos</p>
          <p className="text-2xl font-bold text-foreground mt-1">{analytics.viewsByDay.length}</p>
        </div>
      </div>

      {/* Popular items */}
      {analytics.popularItems.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3">Platos Más Vistos</h3>
          <div className="space-y-2">
            {analytics.popularItems.slice(0, 10).map((item, idx) => (
              <div key={item.item_id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <span className="size-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm text-foreground">{item.item_name}</span>
                <span className="text-sm font-mono text-emerald-400">{item.views} vistas</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Views by table */}
      {analytics.viewsByTable.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3">Vistas por Mesa</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {analytics.viewsByTable.slice(0, 12).map(table => (
              <div key={table.table_number} className="p-3 bg-card border border-border rounded-lg text-center">
                <p className="text-sm font-semibold text-foreground">{table.table_number}</p>
                <p className="text-xs text-muted-foreground">{table.views} vistas</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
