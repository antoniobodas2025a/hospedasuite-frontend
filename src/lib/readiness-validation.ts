/**
 * Readiness Validation — Pure Functions Library
 *
 * Zero side effects. No DB. No cache. Plan-aware computed readiness
 * from existing data. Keyed to PLAN_LIMITS from @/config/saas-plans.
 *
 * Architecture: Pure lib → DAL → Server Actions → UI
 *
 * Scoring: Sum of weights for all Required checks that pass.
 * Optional checks display but do not affect score.
 * Go Live requires 100% of Required checks.
 */

import { PLAN_LABELS, PLAN_LIMITS, type PlanKey } from '@/config/saas-plans'

export type { PlanKey } from '@/config/saas-plans'

// ─── Types ──────────────────────────────────────────────────────

/** Per-item status for a single readiness check evaluation */
export type ReadinessStatus = 'complete' | 'incomplete' | 'na'

/** Categories grouping readiness checks (matches spec registry) */
export type ReadinessCategory =
  | 'hotel'
  | 'rooms'
  | 'policies'
  | 'payment'
  | 'communication'
  | 'ota'
  | 'pro_features'
  | 'team'

/** Plan-specific limits (subset from PLAN_LIMITS, used in check functions) */
type PlanLimits = (typeof PLAN_LIMITS)[PlanKey]

/** Input data shape — all data needed to evaluate all 10 readiness checks */
export interface ReadinessData {
  hotel: {
    name: string | null
    city: string | null
    location: string | null
    check_in_time: string | null
    check_out_time: string | null
    whatsapp: string | null
    email: string | null
    cancellation_policy: string | null
    wompi_public_key: string | null
    wompi_secret_key: string | null
  }
  rooms: ReadinessRoom[]
  menuItems: ReadinessMenuItem[]
  staff: ReadinessStaff[]
}

export interface ReadinessRoom {
  id: string
  name: string
  price: number
  ical_import_url: string | null
}

export interface ReadinessMenuItem {
  id: string
}

export interface ReadinessStaff {
  id: string
}

/** Evaluated result for a single check against a specific hotel + plan */
export interface ReadinessItem {
  id: string
  label: string
  description: string
  category: ReadinessCategory
  status: ReadinessStatus
  weight: number
  requiredForPlans: PlanKey[]
  details?: string
  suggestedAction?: string
}

/** Full readiness evaluation result */
export interface ReadinessResult {
  score: number
  items: ReadinessItem[]
  completedCount: number
  totalCount: number
  isGoLiveReady: boolean
  planTier: PlanKey
  planLabel: string
}

/** Registry check definition — static config for one readiness requirement */
export interface ReadinessCheck {
  id: string
  label: string
  description: string
  category: ReadinessCategory
  weight: number
  /** Plans where this check is Required (affects score and blocks Go Live) */
  requiredForPlans: PlanKey[]
  /** Plans where this check is shown at all (Required + Optional; absent = N/A) */
  applicablePlans: PlanKey[]
  check: (data: ReadinessData, limits: PlanLimits) => boolean
  resolve: (data: ReadinessData, limits: PlanLimits) => { details: string; suggestedAction: string }
}

/** Per-check resolution result returned by resolveCheck() */
export interface ResolveCheckResult {
  checkId: string
  status: ReadinessStatus
  details: string
  suggestedAction: string
}

// ─── Individual Rule Functions ──────────────────────────────────

/** Check 1: Hotel must have name and city configured */
export function checkHotelIdentity(data: ReadinessData, _limits: PlanLimits): boolean {
  const { name, city } = data.hotel
  return !!(name && city)
}

/** Check 2: At least one room must have price greater than zero */
export function checkRoomWithPrice(data: ReadinessData, _limits: PlanLimits): boolean {
  return data.rooms.some((r) => r.price > 0)
}

/** Check 3: Check-in and check-out times must be configured */
export function checkCheckInOutTimes(data: ReadinessData, _limits: PlanLimits): boolean {
  const { check_in_time, check_out_time } = data.hotel
  return !!(check_in_time && check_out_time)
}

/** Check 4: WhatsApp or email must be configured */
export function checkWhatsAppOrEmail(data: ReadinessData, _limits: PlanLimits): boolean {
  const { whatsapp, email } = data.hotel
  return !!(whatsapp || email)
}

/** Check 5: Room count must be within plan unit limit */
export function checkRoomUnitLimit(data: ReadinessData, limits: PlanLimits): boolean {
  return data.rooms.length <= limits.maxUnits
}

/** Check 6: Wompi payment gateway keys must be configured */
export function checkPaymentGateway(data: ReadinessData, _limits: PlanLimits): boolean {
  const { wompi_public_key, wompi_secret_key } = data.hotel
  return !!(wompi_public_key && wompi_secret_key)
}

/** Check 7: Booking cancellation policy must be set */
export function checkCancellationPolicy(data: ReadinessData, _limits: PlanLimits): boolean {
  return !!data.hotel.cancellation_policy
}

/** Check 8: At least one room must have iCal/OTA import URL configured */
export function checkIcalOta(data: ReadinessData, _limits: PlanLimits): boolean {
  return data.rooms.some((r) => !!r.ical_import_url)
}

/** Check 9: At least one Carta Digital menu item must exist */
export function checkCartaDigitalItems(data: ReadinessData, _limits: PlanLimits): boolean {
  return data.menuItems.length >= 1
}

/** Check 10: At least one staff member invited within plan limit */
export function checkStaffInvited(data: ReadinessData, limits: PlanLimits): boolean {
  return data.staff.length >= 1 && data.staff.length <= limits.maxStaff
}

// ─── Resolve Helpers (per-check failure diagnostics) ────────────

function resolveHotelIdentity(data: ReadinessData, _limits: PlanLimits) {
  const { name, city } = data.hotel
  const missing: string[] = []
  if (!name) missing.push('nombre')
  if (!city) missing.push('ciudad')
  return {
    details: `Campos faltantes: ${missing.join(', ') || 'ninguno'}. Nombre actual: "${name || '(vacío)'}", Ciudad: "${city || '(vacío)'}".`,
    suggestedAction: 'Completá el nombre y la ciudad en Configuración → Perfil del hotel.',
  }
}

function resolveRoomWithPrice(data: ReadinessData, _limits: PlanLimits) {
  const roomsWithPrice = data.rooms.filter((r) => r.price > 0)
  const roomsWithoutPrice = data.rooms.filter((r) => r.price <= 0)
  return {
    details: `Habitaciones con precio: ${roomsWithPrice.length}. Habitaciones sin precio: ${roomsWithoutPrice.length} (${roomsWithoutPrice.map((r) => r.name).join(', ') || 'ninguna'}).`,
    suggestedAction: 'Asigná un precio mayor a $0 a al menos una habitación en Configuración → Habitaciones.',
  }
}

function resolveCheckInOutTimes(data: ReadinessData, _limits: PlanLimits) {
  const { check_in_time, check_out_time } = data.hotel
  const missing: string[] = []
  if (!check_in_time) missing.push('check-in')
  if (!check_out_time) missing.push('check-out')
  return {
    details: `Horarios configurados — Check-in: "${check_in_time || '(no configurado)'}", Check-out: "${check_out_time || '(no configurado)'}".`,
    suggestedAction: 'Configurá los horarios de check-in y check-out en Configuración → Políticas del hotel.',
  }
}

function resolveWhatsAppOrEmail(data: ReadinessData, _limits: PlanLimits) {
  const { whatsapp, email } = data.hotel
  const configured: string[] = []
  if (whatsapp) configured.push(`WhatsApp: ${whatsapp}`)
  if (email) configured.push(`Email: ${email}`)
  return {
    details: `Medios configurados: ${configured.length > 0 ? configured.join(', ') : 'ninguno'}.`,
    suggestedAction: 'Configurá al menos un WhatsApp o email en Configuración → Comunicación.',
  }
}

function resolveRoomUnitLimit(data: ReadinessData, limits: PlanLimits) {
  const roomCount = data.rooms.length
  return {
    details: `Unidades actuales: ${roomCount}. Límite del plan: ${limits.maxUnits}. ${roomCount > limits.maxUnits ? `Excedido por ${roomCount - limits.maxUnits} unidad(es).` : 'Dentro del límite.'}`,
    suggestedAction:
      roomCount > limits.maxUnits
        ? `Reducí la cantidad de unidades a ${limits.maxUnits} o menos, o mejorá tu plan para tener más capacidad.`
        : 'No se requiere acción.',
  }
}

function resolvePaymentGateway(data: ReadinessData, _limits: PlanLimits) {
  const { wompi_public_key, wompi_secret_key } = data.hotel
  const missing: string[] = []
  if (!wompi_public_key) missing.push('llave pública (WOMPI_PUBLIC_KEY)')
  if (!wompi_secret_key) missing.push('llave secreta (WOMPI_SECRET_KEY)')
  return {
    details: `Llaves Wompi — Pública: ${wompi_public_key ? 'configurada' : 'FALTANTE'}, Secreta: ${wompi_secret_key ? 'configurada' : 'FALTANTE'}.`,
    suggestedAction:
      missing.length > 0
        ? `Configurá ${missing.join(' y ')} en Configuración → Pagos → Wompi.`
        : 'No se requiere acción.',
  }
}

function resolveCancellationPolicy(data: ReadinessData, _limits: PlanLimits) {
  return {
    details: `Política de cancelación actual: "${data.hotel.cancellation_policy || '(no configurada)'}".`,
    suggestedAction: 'Definí una política de cancelación en Configuración → Políticas del hotel.',
  }
}

function resolveIcalOta(data: ReadinessData, _limits: PlanLimits) {
  const roomsWithIcal = data.rooms.filter((r) => !!r.ical_import_url)
  return {
    details: `Habitaciones con iCal/OTA: ${roomsWithIcal.length} de ${data.rooms.length}.`,
    suggestedAction:
      data.rooms.length === 0
        ? 'Primero creá al menos una habitación, luego configurá la URL iCal en la habitación.'
        : 'Configurá una URL de importación iCal en al menos una habitación para sincronizar con OTAs.',
  }
}

function resolveCartaDigitalItems(data: ReadinessData, _limits: PlanLimits) {
  return {
    details: `Ítems en Carta Digital: ${data.menuItems.length}.`,
    suggestedAction:
      data.menuItems.length === 0
        ? 'Agregá al menos un ítem al menú en Carta Digital → Menú.'
        : 'No se requiere acción.',
  }
}

function resolveStaffInvited(data: ReadinessData, limits: PlanLimits) {
  const staffCount = data.staff.length
  return {
    details: `Staff invitado: ${staffCount}. Límite del plan: ${limits.maxStaff}. ${staffCount === 0 ? 'No hay miembros de staff invitados.' : staffCount > limits.maxStaff ? `Excedido por ${staffCount - limits.maxStaff}.` : 'Dentro del límite.'}`,
    suggestedAction:
      staffCount === 0
        ? 'Invitá al menos un miembro de staff en Configuración → Staff.'
        : staffCount > limits.maxStaff
          ? `Reducí el staff a ${limits.maxStaff} miembros o mejorá tu plan.`
          : 'No se requiere acción.',
  }
}

// ─── Readiness Checks Registry ──────────────────────────────────

/**
 * Static registry of all 10 readiness checks.
 * Weights total: Required = 90%, Optional = 10%. Go Live = 100% Required.
 */
export const READINESS_CHECKS: ReadinessCheck[] = [
  {
    id: 'hotel_identity',
    label: 'Identidad del hotel',
    description: 'Nombre y ciudad del hotel configurados',
    category: 'hotel',
    weight: 15,
    requiredForPlans: ['starter', 'pro', 'enterprise'],
    applicablePlans: ['starter', 'pro', 'enterprise'],
    check: checkHotelIdentity,
    resolve: resolveHotelIdentity,
  },
  {
    id: 'room_with_price',
    label: 'Habitación con precio',
    description: 'Al menos una habitación con precio mayor a $0',
    category: 'rooms',
    weight: 20,
    requiredForPlans: ['starter', 'pro', 'enterprise'],
    applicablePlans: ['starter', 'pro', 'enterprise'],
    check: checkRoomWithPrice,
    resolve: resolveRoomWithPrice,
  },
  {
    id: 'check_in_out_times',
    label: 'Horarios de check-in/out',
    description: 'Horarios de entrada y salida configurados',
    category: 'policies',
    weight: 10,
    requiredForPlans: ['starter', 'pro', 'enterprise'],
    applicablePlans: ['starter', 'pro', 'enterprise'],
    check: checkCheckInOutTimes,
    resolve: resolveCheckInOutTimes,
  },
  {
    id: 'whatsapp_or_email',
    label: 'WhatsApp o email',
    description: 'Al menos un medio de contacto configurado',
    category: 'communication',
    weight: 10,
    requiredForPlans: ['starter', 'pro', 'enterprise'],
    applicablePlans: ['starter', 'pro', 'enterprise'],
    check: checkWhatsAppOrEmail,
    resolve: resolveWhatsAppOrEmail,
  },
  {
    id: 'room_unit_limit',
    label: 'Límite de unidades',
    description: 'Cantidad de habitaciones dentro del límite del plan',
    category: 'rooms',
    weight: 10,
    requiredForPlans: ['starter', 'pro', 'enterprise'],
    applicablePlans: ['starter', 'pro', 'enterprise'],
    check: checkRoomUnitLimit,
    resolve: resolveRoomUnitLimit,
  },
  {
    id: 'payment_gateway',
    label: 'Pasarela de pagos',
    description: 'Llaves de Wompi configuradas',
    category: 'payment',
    weight: 15,
    requiredForPlans: ['starter', 'pro', 'enterprise'],
    applicablePlans: ['starter', 'pro', 'enterprise'],
    check: checkPaymentGateway,
    resolve: resolvePaymentGateway,
  },
  {
    id: 'cancellation_policy',
    label: 'Política de cancelación',
    description: 'Política de cancelación de reservas definida',
    category: 'policies',
    weight: 10,
    requiredForPlans: ['starter', 'pro', 'enterprise'],
    applicablePlans: ['starter', 'pro', 'enterprise'],
    check: checkCancellationPolicy,
    resolve: resolveCancellationPolicy,
  },
  {
    id: 'ical_ota',
    label: 'Sincronización iCal/OTA',
    description: 'URL de importación iCal configurada en al menos una habitación',
    category: 'ota',
    weight: 5,
    requiredForPlans: [],
    applicablePlans: ['pro', 'enterprise'],
    check: checkIcalOta,
    resolve: resolveIcalOta,
  },
  {
    id: 'carta_digital',
    label: 'Carta Digital',
    description: 'Al menos un ítem en el menú de Carta Digital',
    category: 'pro_features',
    weight: 5,
    requiredForPlans: [],
    applicablePlans: ['pro', 'enterprise'],
    check: checkCartaDigitalItems,
    resolve: resolveCartaDigitalItems,
  },
  {
    id: 'staff_invited',
    label: 'Staff invitado',
    description: 'Al menos un miembro de staff invitado dentro del límite del plan',
    category: 'team',
    weight: 0,
    requiredForPlans: [],
    applicablePlans: ['starter', 'pro', 'enterprise'],
    check: checkStaffInvited,
    resolve: resolveStaffInvited,
  },
]

// ─── Core Computation ───────────────────────────────────────────

/**
 * Compute readiness score and per-item status for a hotel given its data and plan.
 *
 * Pure function — no side effects, no DB access.
 *
 * @param data  - Hotel state (rooms, settings, staff, menu items)
 * @param plan  - Current subscription plan tier
 * @returns ReadinessResult with score (0–100), per-item list, and go-live readiness
 */
export function computeReadiness(data: ReadinessData, plan: PlanKey): ReadinessResult {
  const limits = PLAN_LIMITS[plan]
  const items: ReadinessItem[] = []
  let passedRequiredWeight = 0
  let totalRequiredWeight = 0

  for (const check of READINESS_CHECKS) {
    const isApplicable = check.applicablePlans.includes(plan)
    const isRequired = check.requiredForPlans.includes(plan)

    // N/A checks: not shown, not scored (e.g., iCal/OTA for Starter)
    if (!isApplicable) {
      items.push({
        id: check.id,
        label: check.label,
        description: check.description,
        category: check.category,
        status: 'na',
        weight: check.weight,
        requiredForPlans: check.requiredForPlans,
      })
      continue
    }

    const passed = check.check(data, limits)
    const status: ReadinessStatus = passed ? 'complete' : 'incomplete'

    if (isRequired) {
      totalRequiredWeight += check.weight
      if (passed) {
        passedRequiredWeight += check.weight
      }
    }

    items.push({
      id: check.id,
      label: check.label,
      description: check.description,
      category: check.category,
      status,
      weight: check.weight,
      requiredForPlans: check.requiredForPlans,
    })
  }

  const requiredPassCount = items.filter(
    (i) => i.status === 'complete' && i.requiredForPlans.includes(plan),
  ).length
  const requiredTotalCount = items.filter(
    (i) => i.requiredForPlans.includes(plan),
  ).length

  const score = totalRequiredWeight > 0 ? Math.round((passedRequiredWeight / totalRequiredWeight) * 100) : 100
  const isGoLiveReady = score === 100

  return {
    score,
    items,
    completedCount: requiredPassCount,
    totalCount: requiredTotalCount,
    isGoLiveReady,
    planTier: plan,
    planLabel: PLAN_LABELS[plan],
  }
}

/**
 * Resolve a single readiness check — returns detailed diagnostic info.
 *
 * Pure function — no side effects.
 *
 * @param data    - Hotel state (same shape as computeReadiness)
 * @param plan    - Current subscription plan tier
 * @param checkId - The readiness check ID (e.g., 'payment_gateway')
 * @returns ResolveCheckResult with status, details, and suggested action.
 *          Returns null if the check ID is not found in the registry.
 */
export function resolveCheck(
  data: ReadinessData,
  plan: PlanKey,
  checkId: string,
): ResolveCheckResult | null {
  const checkDef = READINESS_CHECKS.find((c) => c.id === checkId)
  if (!checkDef) return null

  const limits = PLAN_LIMITS[plan]
  const isApplicable = checkDef.applicablePlans.includes(plan)

  if (!isApplicable) {
    return {
      checkId: checkDef.id,
      status: 'na',
      details: `Este chequeo no aplica para el plan ${PLAN_LABELS[plan]}.`,
      suggestedAction: 'No se requiere acción para este plan.',
    }
  }

  const passed = checkDef.check(data, limits)
  const { details, suggestedAction } = checkDef.resolve(data, limits)

  return {
    checkId: checkDef.id,
    status: passed ? 'complete' : 'incomplete',
    details,
    suggestedAction,
  }
}
