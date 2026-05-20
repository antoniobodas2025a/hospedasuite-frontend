/**
 * Carta Digital — Server Actions
 *
 * Server actions for the digital menu system.
 * Delegates to the DAL (src/data/carta-digital.ts) for all operations.
 */

'use server'

import { getCurrentHotel } from '@/lib/hotel-context'
import { checkPlanFeature } from '@/data/plan-guard'
import {
  getHotelCategories,
  getActiveCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getHotelMenuItems,
  getActiveMenuItems,
  getFeaturedMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getHotelQRCodes,
  createQRCode,
  deleteQRCode,
  recordMenuView,
  getMenuAnalytics,
  type CreateCategoryInput,
  type CreateMenuItemInput,
  type CreateQRCodeInput,
} from '@/data/carta-digital'
import { revalidatePath, revalidateTag } from 'next/cache'
import { translateCategoryData, translateMenuData } from '@/lib/auto-translate'

// Cache profile for immediate revalidation
const CACHE_PROFILE = 'seconds' as const

// ─── Plan Gating ──────────────────────────────────────────────

async function checkCartaDigitalAccess(): Promise<{ hotelId: string } | { error: string }> {
  const hotel = await getCurrentHotel()
  if (!hotel) return { error: 'No autorizado' }

  const featureCheck = await checkPlanFeature(hotel.id, 'carta_digital')
  if (!featureCheck.ok) return { error: featureCheck.reason }

  return { hotelId: hotel.id }
}

// ─── Categories ───────────────────────────────────────────────

export async function getCategoriesAction() {
  const access = await checkCartaDigitalAccess()
  if ('error' in access) return { success: false, error: access.error }

  const categories = await getHotelCategories(access.hotelId)
  return { success: true, categories }
}

export async function createCategoryAction(input: Omit<CreateCategoryInput, 'hotel_id'>) {
  const access = await checkCartaDigitalAccess()
  if ('error' in access) return { success: false, error: access.error }

  // Auto-translate to English
  const translation = await translateCategoryData({
    name: input.name,
    description: input.description,
  })

  const result = await createCategory({
    ...input,
    hotel_id: access.hotelId,
    name_en: translation.success ? translation.data?.name : undefined,
    description_en: translation.success ? translation.data?.description : undefined,
  })
  if (!result.ok) return { success: false, error: result.error }

  revalidateTag(`carta-${access.hotelId}`, CACHE_PROFILE)
  return { success: true, category: result.data }
}

export async function updateCategoryAction(categoryId: string, updates: Partial<Omit<CreateCategoryInput, 'hotel_id'>>) {
  const access = await checkCartaDigitalAccess()
  if ('error' in access) return { success: false, error: access.error }

  // Auto-translate if Spanish fields changed
  let nameEn = updates.name_en
  let descEn = updates.description_en
  if (updates.name || updates.description) {
    const translation = await translateCategoryData({
      name: updates.name,
      description: updates.description,
    })
    if (translation.success) {
      if (updates.name) nameEn = translation.data?.name
      if (updates.description) descEn = translation.data?.description
    }
  }

  const result = await updateCategory(categoryId, {
    ...updates,
    name_en: nameEn,
    description_en: descEn,
  })
  if (!result.ok) return { success: false, error: result.error }

  revalidateTag(`carta-${access.hotelId}`, CACHE_PROFILE)
  return { success: true, category: result.data }
}

export async function deleteCategoryAction(categoryId: string) {
  const access = await checkCartaDigitalAccess()
  if ('error' in access) return { success: false, error: access.error }

  const result = await deleteCategory(categoryId)
  if (!result.ok) return { success: false, error: result.error }

  revalidateTag(`carta-${access.hotelId}`, CACHE_PROFILE)
  return { success: true }
}

// ─── Menu Items ───────────────────────────────────────────────

export async function getMenuItemsAction() {
  const access = await checkCartaDigitalAccess()
  if ('error' in access) return { success: false, error: access.error }

  const items = await getHotelMenuItems(access.hotelId)
  return { success: true, items }
}

export async function createMenuItemAction(input: Omit<CreateMenuItemInput, 'hotel_id'>) {
  const access = await checkCartaDigitalAccess()
  if ('error' in access) return { success: false, error: access.error }

  // Auto-translate to English
  const translation = await translateMenuData({
    name: input.name,
    description: input.description,
  })

  const result = await createMenuItem({
    ...input,
    hotel_id: access.hotelId,
    name_en: translation.success ? translation.data?.name : undefined,
    description_en: translation.success ? translation.data?.description : undefined,
  })
  if (!result.ok) return { success: false, error: result.error }

  revalidateTag(`carta-${access.hotelId}`, CACHE_PROFILE)
  return { success: true, item: result.data }
}

export async function updateMenuItemAction(itemId: string, updates: Partial<Omit<CreateMenuItemInput, 'hotel_id'> & { is_available?: boolean; is_featured?: boolean }>) {
  const access = await checkCartaDigitalAccess()
  if ('error' in access) return { success: false, error: access.error }

  // Auto-translate if Spanish fields changed
  let nameEn = updates.name_en
  let descEn = updates.description_en
  if (updates.name || updates.description) {
    const translation = await translateMenuData({
      name: updates.name,
      description: updates.description,
    })
    if (translation.success) {
      if (updates.name) nameEn = translation.data?.name
      if (updates.description) descEn = translation.data?.description
    }
  }

  const result = await updateMenuItem(itemId, {
    ...updates,
    name_en: nameEn,
    description_en: descEn,
  })
  if (!result.ok) return { success: false, error: result.error }

  revalidateTag(`carta-${access.hotelId}`, CACHE_PROFILE)
  return { success: true, item: result.data }
}

export async function deleteMenuItemAction(itemId: string) {
  const access = await checkCartaDigitalAccess()
  if ('error' in access) return { success: false, error: access.error }

  const result = await deleteMenuItem(itemId)
  if (!result.ok) return { success: false, error: result.error }

  revalidateTag(`carta-${access.hotelId}`, CACHE_PROFILE)
  return { success: true }
}

// ─── QR Codes ─────────────────────────────────────────────────

export async function getQRCodesAction() {
  const access = await checkCartaDigitalAccess()
  if ('error' in access) return { success: false, error: access.error }

  const codes = await getHotelQRCodes(access.hotelId)
  return { success: true, codes }
}

export async function createQRCodeAction(input: Omit<CreateQRCodeInput, 'hotel_id'>) {
  const access = await checkCartaDigitalAccess()
  if ('error' in access) return { success: false, error: access.error }

  // Get hotel slug for QR URL
  const { getHotelWithPlan } = await import('@/data/hotels')
  const hotel = await getHotelWithPlan(access.hotelId)
  const slug = hotel?.slug || 'hotel'

  // Auto-generate QR URL with hotel slug
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hospedasuite.com'
  const qrData = `${baseUrl}/carta/${slug}?table=${encodeURIComponent(input.table_number)}`

  const result = await createQRCode({ ...input, hotel_id: access.hotelId, qr_data: qrData })
  if (!result.ok) return { success: false, error: result.error }

  return { success: true, code: result.data, hotelSlug: slug }
}

export async function deleteQRCodeAction(qrId: string) {
  const access = await checkCartaDigitalAccess()
  if ('error' in access) return { success: false, error: access.error }

  const result = await deleteQRCode(qrId)
  if (!result.ok) return { success: false, error: result.error }

  return { success: true }
}

// ─── Analytics ────────────────────────────────────────────────

export async function getCartaAnalyticsAction(days: number = 30) {
  const access = await checkCartaDigitalAccess()
  if ('error' in access) return { success: false, error: access.error }

  const analytics = await getMenuAnalytics(access.hotelId, days)
  return { success: true, analytics }
}

export async function getCartaHotelSlugAction() {
  const access = await checkCartaDigitalAccess()
  if ('error' in access) return { success: false, error: access.error }

  const { getHotelWithPlan } = await import('@/data/hotels')
  const hotel = await getHotelWithPlan(access.hotelId)
  return { success: true, slug: hotel?.slug || 'hotel' }
}

// ─── Public (no auth required) ────────────────────────────────

export async function getPublicCartaAction(hotelSlug: string, language: string = 'es') {
  const { getHotelBySlug } = await import('@/data/hotels')
  const hotel = await getHotelBySlug(hotelSlug)

  if (!hotel) return { success: false, error: 'Hotel not found' }

  const categories = await getActiveCategories(hotel.id)
  const items = await getActiveMenuItems(hotel.id)

  // Record view
  await recordMenuView(hotel.id, { language })

  return {
    success: true,
    hotel: {
      id: hotel.id,
      name: hotel.name,
      slug: hotel.slug,
    },
    categories,
    items,
  }
}
