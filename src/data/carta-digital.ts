/**
 * Carta Digital — DAL Module
 *
 * Server-only data access layer for the digital menu system.
 * Handles categories, menu items, QR codes, and analytics.
 *
 * Pattern (Next.js best practice):
 *   - import 'server-only' prevents client-side usage
 *   - Uses Supabase admin client for server-side operations
 *   - All mutations verify hotel ownership before executing
 */

import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { verifyHotelOwnership } from './hotels'

// ─── Types ────────────────────────────────────────────────────

export interface MenuCategoryDTO {
  id: string
  hotel_id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MenuItemDTO {
  id: string
  hotel_id: string
  category_id: string | null
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  price: number
  image_url: string | null
  is_available: boolean
  is_featured: boolean
  display_order: number
  tags: string[] | null
  allergens: string[] | null
  preparation_time_min: number | null
  calories: number | null
  /** Legacy: category name as string (for POS compatibility) */
  category_legacy: string | null
  /** Legacy: emoji fallback (for POS compatibility) */
  image_emoji: string | null
  created_at: string
  updated_at: string
}

export interface QRCodeDTO {
  id: string
  hotel_id: string
  table_number: string
  qr_data: string
  qr_image_url: string | null
  is_active: boolean
  scan_count: number
  created_at: string
  updated_at: string
}

export interface MenuViewDTO {
  id: string
  hotel_id: string
  menu_item_id: string | null
  qr_code_id: string | null
  viewed_at: string
  user_agent: string | null
  language: string
  table_number: string | null
  session_id: string | null
}

export interface CreateCategoryInput {
  hotel_id: string
  name: string
  name_en?: string
  description?: string
  description_en?: string
  display_order?: number
}

export interface CreateMenuItemInput {
  hotel_id: string
  category_id?: string
  name: string
  name_en?: string
  description?: string
  description_en?: string
  price: number
  image_url?: string
  is_available?: boolean
  is_featured?: boolean
  display_order?: number
  tags?: string[]
  allergens?: string[]
  preparation_time_min?: number
  calories?: number
}

export interface CreateQRCodeInput {
  hotel_id: string
  table_number: string
  qr_data: string
}

// ─── Supabase Admin Client ────────────────────────────────────

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Categories ───────────────────────────────────────────────

export async function getHotelCategories(hotelId: string): Promise<MenuCategoryDTO[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('display_order')

  if (error) return []
  return (data || []) as MenuCategoryDTO[]
}

export async function getActiveCategories(hotelId: string): Promise<MenuCategoryDTO[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_active', true)
    .order('display_order')

  if (error) return []
  return (data || []) as MenuCategoryDTO[]
}

export async function createCategory(
  input: CreateCategoryInput
): Promise<{ ok: boolean; data?: MenuCategoryDTO; error?: string }> {
  const isOwner = await verifyHotelOwnership(input.hotel_id)
  if (!isOwner) return { ok: false, error: 'Unauthorized' }

  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('menu_categories')
    .insert({
      hotel_id: input.hotel_id,
      name: input.name,
      name_en: input.name_en || null,
      description: input.description || null,
      description_en: input.description_en || null,
      display_order: input.display_order || 0,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as MenuCategoryDTO }
}

export async function updateCategory(
  categoryId: string,
  updates: Partial<CreateCategoryInput>
): Promise<{ ok: boolean; data?: MenuCategoryDTO; error?: string }> {
  const supabase = getAdminClient()

  const { data: existing } = await supabase
    .from('menu_categories')
    .select('hotel_id')
    .eq('id', categoryId)
    .single()

  if (!existing) return { ok: false, error: 'Category not found' }

  const isOwner = await verifyHotelOwnership(existing.hotel_id)
  if (!isOwner) return { ok: false, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('menu_categories')
    .update({
      ...(updates.name && { name: updates.name }),
      ...(updates.name_en !== undefined && { name_en: updates.name_en }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.description_en !== undefined && { description_en: updates.description_en }),
      ...(updates.display_order !== undefined && { display_order: updates.display_order }),
    })
    .eq('id', categoryId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as MenuCategoryDTO }
}

export async function deleteCategory(categoryId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAdminClient()

  const { data: existing } = await supabase
    .from('menu_categories')
    .select('hotel_id')
    .eq('id', categoryId)
    .single()

  if (!existing) return { ok: false, error: 'Category not found' }

  const isOwner = await verifyHotelOwnership(existing.hotel_id)
  if (!isOwner) return { ok: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', categoryId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ─── Menu Items ───────────────────────────────────────────────

export async function getHotelMenuItems(hotelId: string): Promise<MenuItemDTO[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('display_order')

  if (error) return []
  return (data || []) as MenuItemDTO[]
}

export async function getActiveMenuItems(hotelId: string): Promise<MenuItemDTO[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_available', true)
    .order('display_order')

  if (error) return []
  return (data || []) as MenuItemDTO[]
}

export async function getFeaturedMenuItems(hotelId: string): Promise<MenuItemDTO[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_available', true)
    .eq('is_featured', true)
    .order('display_order')

  if (error) return []
  return (data || []) as MenuItemDTO[]
}

export async function createMenuItem(
  input: CreateMenuItemInput
): Promise<{ ok: boolean; data?: MenuItemDTO; error?: string }> {
  const isOwner = await verifyHotelOwnership(input.hotel_id)
  if (!isOwner) return { ok: false, error: 'Unauthorized' }

  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      hotel_id: input.hotel_id,
      category_id: input.category_id || null,
      name: input.name,
      name_en: input.name_en || null,
      description: input.description || null,
      description_en: input.description_en || null,
      price: input.price,
      image_url: input.image_url || null,
      is_available: input.is_available ?? true,
      is_featured: input.is_featured ?? false,
      display_order: input.display_order || 0,
      tags: input.tags || null,
      allergens: input.allergens || null,
      preparation_time_min: input.preparation_time_min || null,
      calories: input.calories || null,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as MenuItemDTO }
}

export async function updateMenuItem(
  itemId: string,
  updates: Partial<CreateMenuItemInput> & { is_available?: boolean; is_featured?: boolean }
): Promise<{ ok: boolean; data?: MenuItemDTO; error?: string }> {
  const supabase = getAdminClient()

  const { data: existing } = await supabase
    .from('menu_items')
    .select('hotel_id')
    .eq('id', itemId)
    .single()

  if (!existing) return { ok: false, error: 'Item not found' }

  const isOwner = await verifyHotelOwnership(existing.hotel_id)
  if (!isOwner) return { ok: false, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('menu_items')
    .update({
      ...(updates.name && { name: updates.name }),
      ...(updates.name_en !== undefined && { name_en: updates.name_en }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.description_en !== undefined && { description_en: updates.description_en }),
      ...(updates.price !== undefined && { price: updates.price }),
      ...(updates.image_url !== undefined && { image_url: updates.image_url }),
      ...(updates.is_available !== undefined && { is_available: updates.is_available }),
      ...(updates.is_featured !== undefined && { is_featured: updates.is_featured }),
      ...(updates.display_order !== undefined && { display_order: updates.display_order }),
      ...(updates.tags !== undefined && { tags: updates.tags }),
      ...(updates.allergens !== undefined && { allergens: updates.allergens }),
      ...(updates.preparation_time_min !== undefined && { preparation_time_min: updates.preparation_time_min }),
      ...(updates.calories !== undefined && { calories: updates.calories }),
      ...(updates.category_id !== undefined && { category_id: updates.category_id }),
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as MenuItemDTO }
}

export async function deleteMenuItem(itemId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAdminClient()

  const { data: existing } = await supabase
    .from('menu_items')
    .select('hotel_id')
    .eq('id', itemId)
    .single()

  if (!existing) return { ok: false, error: 'Item not found' }

  const isOwner = await verifyHotelOwnership(existing.hotel_id)
  if (!isOwner) return { ok: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', itemId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ─── QR Codes ─────────────────────────────────────────────────

export async function getHotelQRCodes(hotelId: string): Promise<QRCodeDTO[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('table_number')

  if (error) return []
  return (data || []) as QRCodeDTO[]
}

export async function createQRCode(
  input: CreateQRCodeInput
): Promise<{ ok: boolean; data?: QRCodeDTO; error?: string }> {
  const isOwner = await verifyHotelOwnership(input.hotel_id)
  if (!isOwner) return { ok: false, error: 'Unauthorized' }

  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('qr_codes')
    .insert({
      hotel_id: input.hotel_id,
      table_number: input.table_number,
      qr_data: input.qr_data,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: `La mesa ${input.table_number} ya tiene un código QR` }
    }
    return { ok: false, error: error.message }
  }

  return { ok: true, data: data as QRCodeDTO }
}

export async function deleteQRCode(qrId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAdminClient()

  const { data: existing } = await supabase
    .from('qr_codes')
    .select('hotel_id')
    .eq('id', qrId)
    .single()

  if (!existing) return { ok: false, error: 'QR code not found' }

  const isOwner = await verifyHotelOwnership(existing.hotel_id)
  if (!isOwner) return { ok: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('qr_codes')
    .delete()
    .eq('id', qrId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function incrementQRScan(qrId: string): Promise<void> {
  const supabase = getAdminClient()

  // Fetch current count, then increment (Supabase JS client doesn't support raw SQL)
  const { data } = await supabase
    .from('qr_codes')
    .select('scan_count')
    .eq('id', qrId)
    .single()

  if (data) {
    await supabase
      .from('qr_codes')
      .update({ scan_count: (data.scan_count || 0) + 1 })
      .eq('id', qrId)
  }
}

// ─── Analytics ────────────────────────────────────────────────

export async function recordMenuView(
  hotelId: string,
  options?: {
    menuItemId?: string
    qrCodeId?: string
    userAgent?: string
    language?: string
    tableNumber?: string
    sessionId?: string
  }
): Promise<void> {
  const supabase = getAdminClient()

  await supabase
    .from('menu_views')
    .insert({
      hotel_id: hotelId,
      menu_item_id: options?.menuItemId || null,
      qr_code_id: options?.qrCodeId || null,
      user_agent: options?.userAgent || null,
      language: options?.language || 'es',
      table_number: options?.tableNumber || null,
      session_id: options?.sessionId || null,
    })
}

export async function getMenuAnalytics(
  hotelId: string,
  days: number = 30
): Promise<{
  totalViews: number
  viewsByDay: Array<{ date: string; count: number }>
  popularItems: Array<{ item_id: string; item_name: string; views: number }>
  viewsByTable: Array<{ table_number: string; views: number }>
}> {
  const supabase = getAdminClient()
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // Total views
  const { data: totalData, error: totalError } = await supabase
    .from('menu_views')
    .select('id', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)
    .gte('viewed_at', cutoff)

  // Views by day
  const { data: dailyData } = await supabase
    .from('menu_views')
    .select('viewed_at')
    .eq('hotel_id', hotelId)
    .gte('viewed_at', cutoff)

  // Popular items
  const { data: popularData } = await supabase
    .from('menu_views')
    .select('menu_item_id, menu_items(name)')
    .eq('hotel_id', hotelId)
    .gte('viewed_at', cutoff)
    .not('menu_item_id', 'is', null)

  // Views by table
  const { data: tableData } = await supabase
    .from('menu_views')
    .select('table_number')
    .eq('hotel_id', hotelId)
    .gte('viewed_at', cutoff)
    .not('table_number', 'is', null)

  // Aggregate
  const viewsByDay: Record<string, number> = {}
  dailyData?.forEach((v: any) => {
    const day = new Date(v.viewed_at).toISOString().split('T')[0]
    viewsByDay[day] = (viewsByDay[day] || 0) + 1
  })

  const popularItems: Record<string, { name: string; views: number }> = {}
  popularData?.forEach((v: any) => {
    const id = v.menu_item_id
    if (!popularItems[id]) {
      popularItems[id] = { name: v.menu_items?.name || 'Unknown', views: 0 }
    }
    popularItems[id].views++
  })

  const viewsByTable: Record<string, number> = {}
  tableData?.forEach((v: any) => {
    viewsByTable[v.table_number] = (viewsByTable[v.table_number] || 0) + 1
  })

  return {
    totalViews: totalData?.length || 0,
    viewsByDay: Object.entries(viewsByDay).map(([date, count]) => ({ date, count })),
    popularItems: Object.entries(popularItems).map(([item_id, { name, views }]) => ({ item_id, item_name: name, views })).sort((a, b) => b.views - a.views),
    viewsByTable: Object.entries(viewsByTable).map(([table_number, views]) => ({ table_number, views })).sort((a, b) => b.views - a.views),
  }
}
