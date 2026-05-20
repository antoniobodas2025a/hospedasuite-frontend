import { describe, it, expect } from 'vitest'
import {
  computeReadiness,
  resolveCheck,
  READINESS_CHECKS,
  checkHotelIdentity,
  checkRoomWithPrice,
  checkCheckInOutTimes,
  checkWhatsAppOrEmail,
  checkRoomUnitLimit,
  checkPaymentGateway,
  checkCancellationPolicy,
  checkIcalOta,
  checkCartaDigitalItems,
  checkStaffInvited,
  type ReadinessData,
  type PlanKey,
} from '../readiness-validation'
import { PLAN_LIMITS } from '@/config/saas-plans'

// ─── Test Helpers ───────────────────────────────────────────────

/** Full-pass hotel data (Starter plan, all required checks pass) */
function fullPassData(): ReadinessData {
  return {
    hotel: {
      name: 'Hotel Paraíso',
      city: 'Cartagena',
      location: 'Bocagrande',
      check_in_time: '15:00',
      check_out_time: '12:00',
      whatsapp: '+573001234567',
      email: 'reservas@paraiso.com',
      cancellation_policy: 'Cancelación gratuita hasta 24h antes.',
      wompi_public_key: 'pub_test_abc123',
      wompi_secret_key: 'sec_test_xyz789',
    },
    rooms: [
      { id: 'r1', name: 'Suite Deluxe', price: 150000, ical_import_url: null },
      { id: 'r2', name: 'Habitación Estándar', price: 80000, ical_import_url: null },
    ],
    menuItems: [{ id: 'm1' }, { id: 'm2' }],
    staff: [{ id: 's1' }, { id: 's2' }],
  }
}

/** Minimal empty data — hotel has nothing configured */
function emptyData(): ReadinessData {
  return {
    hotel: {
      name: null,
      city: null,
      location: null,
      check_in_time: null,
      check_out_time: null,
      whatsapp: null,
      email: null,
      cancellation_policy: null,
      wompi_public_key: null,
      wompi_secret_key: null,
    },
    rooms: [],
    menuItems: [],
    staff: [],
  }
}

function starterLimits() {
  return PLAN_LIMITS.starter
}
function proLimits() {
  return PLAN_LIMITS.pro
}

// ─── Registry Structure ─────────────────────────────────────────

describe('READINESS_CHECKS registry', () => {
  it('should have exactly 10 checks', () => {
    expect(READINESS_CHECKS).toHaveLength(10)
  })

  it('should have unique IDs for all checks', () => {
    const ids = READINESS_CHECKS.map((c) => c.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(10)
  })

  it('should have 7 Required checks for Starter plan', () => {
    const required = READINESS_CHECKS.filter((c) =>
      c.requiredForPlans.includes('starter'),
    )
    expect(required).toHaveLength(7)
  })

  it('should have 7 Required checks for Pro plan', () => {
    const required = READINESS_CHECKS.filter((c) =>
      c.requiredForPlans.includes('pro'),
    )
    expect(required).toHaveLength(7)
  })

  it('checks 8 and 9 should not be applicable for Starter', () => {
    const ical = READINESS_CHECKS.find((c) => c.id === 'ical_ota')!
    const carta = READINESS_CHECKS.find((c) => c.id === 'carta_digital')!
    expect(ical.applicablePlans).not.toContain('starter')
    expect(carta.applicablePlans).not.toContain('starter')
    expect(ical.applicablePlans).toContain('pro')
    expect(carta.applicablePlans).toContain('pro')
  })

  it('check 10 (staff) should be applicable for all plans but required for none', () => {
    const staff = READINESS_CHECKS.find((c) => c.id === 'staff_invited')!
    expect(staff.requiredForPlans).toHaveLength(0)
    expect(staff.applicablePlans).toEqual(['starter', 'pro', 'enterprise'])
  })

  it('total required weight should be 90% for Starter', () => {
    const required = READINESS_CHECKS.filter((c) =>
      c.requiredForPlans.includes('starter'),
    )
    const totalWeight = required.reduce((sum, c) => sum + c.weight, 0)
    expect(totalWeight).toBe(90)
  })

  it('every check should have id, label, description, category, and resolve', () => {
    for (const c of READINESS_CHECKS) {
      expect(c.id).toBeTruthy()
      expect(c.label).toBeTruthy()
      expect(c.description).toBeTruthy()
      expect(c.category).toBeTruthy()
      expect(typeof c.check).toBe('function')
      expect(typeof c.resolve).toBe('function')
    }
  })
})

// ─── Individual Check Functions ─────────────────────────────────

describe('checkHotelIdentity', () => {
  it('passes when name and city are set', () => {
    const data = fullPassData()
    expect(checkHotelIdentity(data, starterLimits())).toBe(true)
  })

  it('fails when name is missing', () => {
    const data = fullPassData()
    data.hotel.name = null
    expect(checkHotelIdentity(data, starterLimits())).toBe(false)
  })

  it('fails when city is missing', () => {
    const data = fullPassData()
    data.hotel.city = null
    expect(checkHotelIdentity(data, starterLimits())).toBe(false)
  })

  it('fails when both are missing', () => {
    const data = emptyData()
    expect(checkHotelIdentity(data, starterLimits())).toBe(false)
  })
})

describe('checkRoomWithPrice', () => {
  it('passes when at least one room has price > 0', () => {
    const data = fullPassData()
    expect(checkRoomWithPrice(data, starterLimits())).toBe(true)
  })

  it('fails when all rooms have price 0', () => {
    const data = fullPassData()
    data.rooms = [
      { id: 'r1', name: 'A', price: 0, ical_import_url: null },
      { id: 'r2', name: 'B', price: 0, ical_import_url: null },
    ]
    expect(checkRoomWithPrice(data, starterLimits())).toBe(false)
  })

  it('fails when there are no rooms', () => {
    const data = emptyData()
    expect(checkRoomWithPrice(data, starterLimits())).toBe(false)
  })

  it('passes when only one room has price > 0 among many', () => {
    const data = fullPassData()
    data.rooms = [
      { id: 'r1', name: 'A', price: 0, ical_import_url: null },
      { id: 'r2', name: 'B', price: 50000, ical_import_url: null },
      { id: 'r3', name: 'C', price: 0, ical_import_url: null },
    ]
    expect(checkRoomWithPrice(data, starterLimits())).toBe(true)
  })
})

describe('checkCheckInOutTimes', () => {
  it('passes when both times are configured', () => {
    const data = fullPassData()
    expect(checkCheckInOutTimes(data, starterLimits())).toBe(true)
  })

  it('fails when check-in time is missing', () => {
    const data = fullPassData()
    data.hotel.check_in_time = null
    expect(checkCheckInOutTimes(data, starterLimits())).toBe(false)
  })

  it('fails when check-out time is missing', () => {
    const data = fullPassData()
    data.hotel.check_out_time = null
    expect(checkCheckInOutTimes(data, starterLimits())).toBe(false)
  })
})

describe('checkWhatsAppOrEmail', () => {
  it('passes when WhatsApp is set', () => {
    const data = fullPassData()
    data.hotel.email = null
    expect(checkWhatsAppOrEmail(data, starterLimits())).toBe(true)
  })

  it('passes when email is set', () => {
    const data = fullPassData()
    data.hotel.whatsapp = null
    expect(checkWhatsAppOrEmail(data, starterLimits())).toBe(true)
  })

  it('passes when both are set', () => {
    expect(checkWhatsAppOrEmail(fullPassData(), starterLimits())).toBe(true)
  })

  it('fails when neither is set', () => {
    const data = fullPassData()
    data.hotel.whatsapp = null
    data.hotel.email = null
    expect(checkWhatsAppOrEmail(data, starterLimits())).toBe(false)
  })
})

describe('checkRoomUnitLimit', () => {
  it('passes when room count is within Starter limit (4)', () => {
    const data = fullPassData()
    data.rooms = [
      { id: 'r1', name: 'A', price: 100, ical_import_url: null },
      { id: 'r2', name: 'B', price: 100, ical_import_url: null },
      { id: 'r3', name: 'C', price: 100, ical_import_url: null },
      { id: 'r4', name: 'D', price: 100, ical_import_url: null },
    ]
    expect(checkRoomUnitLimit(data, starterLimits())).toBe(true)
  })

  it('fails when room count exceeds Starter limit', () => {
    const data = fullPassData()
    data.rooms = Array.from({ length: 5 }, (_, i) => ({
      id: `r${i}`,
      name: `Room ${i}`,
      price: 100,
      ical_import_url: null,
    }))
    expect(checkRoomUnitLimit(data, starterLimits())).toBe(false)
  })

  it('passes when room count is within Pro limit (14)', () => {
    const data = fullPassData()
    data.rooms = Array.from({ length: 14 }, (_, i) => ({
      id: `r${i}`,
      name: `Room ${i}`,
      price: 100,
      ical_import_url: null,
    }))
    expect(checkRoomUnitLimit(data, proLimits())).toBe(true)
  })

  it('fails when room count exceeds Pro limit', () => {
    const data = fullPassData()
    data.rooms = Array.from({ length: 15 }, (_, i) => ({
      id: `r${i}`,
      name: `Room ${i}`,
      price: 100,
      ical_import_url: null,
    }))
    expect(checkRoomUnitLimit(data, proLimits())).toBe(false)
  })
})

describe('checkPaymentGateway', () => {
  it('passes when both Wompi keys are set', () => {
    expect(checkPaymentGateway(fullPassData(), starterLimits())).toBe(true)
  })

  it('fails when public key is missing', () => {
    const data = fullPassData()
    data.hotel.wompi_public_key = null
    expect(checkPaymentGateway(data, starterLimits())).toBe(false)
  })

  it('fails when secret key is missing', () => {
    const data = fullPassData()
    data.hotel.wompi_secret_key = null
    expect(checkPaymentGateway(data, starterLimits())).toBe(false)
  })

  it('fails when both keys are missing', () => {
    const data = fullPassData()
    data.hotel.wompi_public_key = null
    data.hotel.wompi_secret_key = null
    expect(checkPaymentGateway(data, starterLimits())).toBe(false)
  })
})

describe('checkCancellationPolicy', () => {
  it('passes when policy is set', () => {
    expect(checkCancellationPolicy(fullPassData(), starterLimits())).toBe(true)
  })

  it('fails when policy is null', () => {
    const data = fullPassData()
    data.hotel.cancellation_policy = null
    expect(checkCancellationPolicy(data, starterLimits())).toBe(false)
  })
})

describe('checkIcalOta', () => {
  it('passes when at least one room has iCal URL', () => {
    const data = fullPassData()
    data.rooms[0].ical_import_url = 'https://ical.example.com/feed.ics'
    expect(checkIcalOta(data, proLimits())).toBe(true)
  })

  it('fails when no room has iCal URL', () => {
    const data = fullPassData()
    data.rooms.forEach((r) => (r.ical_import_url = null))
    expect(checkIcalOta(data, proLimits())).toBe(false)
  })

  it('fails when there are no rooms', () => {
    const data = emptyData()
    expect(checkIcalOta(data, proLimits())).toBe(false)
  })
})

describe('checkCartaDigitalItems', () => {
  it('passes when there is at least one menu item', () => {
    expect(checkCartaDigitalItems(fullPassData(), proLimits())).toBe(true)
  })

  it('fails when menu items array is empty', () => {
    const data = fullPassData()
    data.menuItems = []
    expect(checkCartaDigitalItems(data, proLimits())).toBe(false)
  })
})

describe('checkStaffInvited', () => {
  it('passes with 1 staff member within Starter limit (2)', () => {
    const data = fullPassData()
    data.staff = [{ id: 's1' }]
    expect(checkStaffInvited(data, starterLimits())).toBe(true)
  })

  it('fails when no staff is invited', () => {
    const data = fullPassData()
    data.staff = []
    expect(checkStaffInvited(data, starterLimits())).toBe(false)
  })

  it('fails when staff count exceeds plan limit', () => {
    const data = fullPassData()
    data.staff = [
      { id: 's1' },
      { id: 's2' },
      { id: 's3' },
    ] // Starter limit is 2
    expect(checkStaffInvited(data, starterLimits())).toBe(false)
  })

  it('passes with 5 staff within Pro limit', () => {
    const data = fullPassData()
    data.staff = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}` }))
    expect(checkStaffInvited(data, proLimits())).toBe(true)
  })
})

// ─── computeReadiness — Full Pass Scenarios ─────────────────────

describe('computeReadiness', () => {
  describe('full pass — Starter plan', () => {
    const result = computeReadiness(fullPassData(), 'starter')

    it('should have score 100', () => {
      expect(result.score).toBe(100)
    })

    it('should be Go Live ready', () => {
      expect(result.isGoLiveReady).toBe(true)
    })

    it('should have correct plan info', () => {
      expect(result.planTier).toBe('starter')
      expect(result.planLabel).toBe('Starter')
    })

    it('should have 7 completed required checks', () => {
      expect(result.completedCount).toBe(7)
      expect(result.totalCount).toBe(7)
    })

    it('should mark iCal/OTA and Carta Digital as N/A for Starter', () => {
      const ical = result.items.find((i) => i.id === 'ical_ota')!
      const carta = result.items.find((i) => i.id === 'carta_digital')!
      expect(ical.status).toBe('na')
      expect(carta.status).toBe('na')
    })

    it('should show staff check as Optional (present but not in required count)', () => {
      const staff = result.items.find((i) => i.id === 'staff_invited')!
      expect(staff.status).toBe('complete')
      expect(staff.requiredForPlans).toHaveLength(0)
    })

    it('should include all 10 checks in items array', () => {
      expect(result.items).toHaveLength(10)
    })
  })

  describe('full pass — Pro plan', () => {
    const data = fullPassData()
    data.rooms[0].ical_import_url = 'https://ical.example.com/feed.ics'
    const result = computeReadiness(data, 'pro')

    it('should have score 100', () => {
      expect(result.score).toBe(100)
    })

    it('should show iCal/OTA and Carta Digital as Optional (not N/A)', () => {
      const ical = result.items.find((i) => i.id === 'ical_ota')!
      const carta = result.items.find((i) => i.id === 'carta_digital')!
      expect(ical.status).not.toBe('na')
      expect(carta.status).not.toBe('na')
    })

    it('should not count Optional checks in completedCount', () => {
      expect(result.completedCount).toBe(7)
      expect(result.totalCount).toBe(7)
    })
  })

  // ─── Missing Required Checks ────────────────────────────────

  describe('missing room price — Starter', () => {
    const data = fullPassData()
    data.rooms = [
      { id: 'r1', name: 'Suite', price: 0, ical_import_url: null },
    ]
    const result = computeReadiness(data, 'starter')

    it('should have score below 100 (missing 20% weight)', () => {
      // Only check 2 fails (20% weight). Passed: 15+10+10+10+15+10 = 70 out of 90
      expect(result.score).toBe(78) // 70/90 ≈ 77.78 → 78
    })

    it('should not be Go Live ready', () => {
      expect(result.isGoLiveReady).toBe(false)
    })

    it('should mark room_with_price as incomplete', () => {
      const item = result.items.find((i) => i.id === 'room_with_price')!
      expect(item.status).toBe('incomplete')
    })

    it('should have all other required checks complete', () => {
      const otherRequired = result.items.filter(
        (i) => i.id !== 'room_with_price' && i.requiredForPlans.includes('starter' as PlanKey),
      )
      for (const item of otherRequired) {
        expect(item.status).toBe('complete')
      }
    })
  })

  describe('multiple failures — Starter', () => {
    const data = fullPassData()
    data.hotel.name = null // check 1 fails (15%)
    data.hotel.city = null
    data.rooms[0].price = 0 // check 2 fails (20%)
    data.rooms[1].price = 0
    data.hotel.wompi_public_key = null // check 6 fails (15%)
    const result = computeReadiness(data, 'starter')

    it('should have score reflecting only passed checks', () => {
      // Passed: check 3(10) + check 4(10) + check 5(10) + check 7(10) = 40 out of 90
      expect(result.score).toBe(44) // 40/90 ≈ 44.44 → 44
    })

    it('should have 3 incomplete required checks', () => {
      const incomplete = result.items.filter(
        (i) => i.status === 'incomplete' && i.requiredForPlans.includes('starter' as PlanKey),
      )
      expect(incomplete.length).toBeGreaterThanOrEqual(3)
    })

    it('should not be Go Live ready', () => {
      expect(result.isGoLiveReady).toBe(false)
    })
  })

  // ─── Partial Score Calculation ─────────────────────────────

  describe('partial score calculation — Pro', () => {
    it('should compute correct score when multiple required checks fail', () => {
      const data = fullPassData()
      // Fail: identity(15) + whatsapp(10) + payment(15) + cancellation(10) = 50 failed
      // Pass: room(20) + check-in(10) + unit(10) = 40 passed
      data.hotel.whatsapp = null
      data.hotel.email = null
      data.hotel.wompi_public_key = null
      data.hotel.wompi_secret_key = null
      data.hotel.cancellation_policy = null
      data.hotel.name = null
      data.hotel.city = null
      const result = computeReadiness(data, 'pro')
      expect(result.score).toBe(44) // 40/90 = 44.44 → 44
    })
  })

  // ─── Edge Cases ────────────────────────────────────────────

  describe('edge cases', () => {
    it('should return score 11 when nothing is configured (room_unit_limit still passes with 0 rooms)', () => {
      const result = computeReadiness(emptyData(), 'starter')
      // 0 rooms <= 4 maxUnits → room_unit_limit passes (10 weight). 10/90 = 11.11 → 11
      expect(result.score).toBe(11)
      expect(result.isGoLiveReady).toBe(false)
      expect(result.completedCount).toBe(1) // room_unit_limit passes: 0 rooms <= 4
      expect(result.totalCount).toBe(7)
    })

    it('should work with Enterprise plan', () => {
      const data = fullPassData()
      data.rooms[0].ical_import_url = 'https://ical.example.com/feed.ics'
      const result = computeReadiness(data, 'enterprise')
      expect(result.planTier).toBe('enterprise')
      expect(result.planLabel).toBe('Enterprise')
      expect(result.score).toBe(100)
      expect(result.isGoLiveReady).toBe(true)
    })

    it('should show staff as Optional with weight=0 for all plans', () => {
      for (const plan of ['starter', 'pro', 'enterprise'] as PlanKey[]) {
        const result = computeReadiness(fullPassData(), plan)
        const staff = result.items.find((i) => i.id === 'staff_invited')!
        expect(staff.weight).toBe(0)
        expect(staff.requiredForPlans).toHaveLength(0)
      }
    })

    it('should handle plan with no required checks gracefully', () => {
      // All plans have 7 required checks, so this is more about computation stability
      const result = computeReadiness(emptyData(), 'starter')
      // 0 rooms <= 4 maxUnits → room_unit_limit passes (10 weight). 10/90 = 11
      expect(result.score).toBe(11)
      expect(typeof result.score).toBe('number')
      expect(Array.isArray(result.items)).toBe(true)
    })
  })

  // ─── Skip Logic for N/A Items ──────────────────────────────

  describe('skip logic — N/A items', () => {
    it('Starter: iCal/OTA and Carta Digital should be N/A', () => {
      const result = computeReadiness(fullPassData(), 'starter')
      const ical = result.items.find((i) => i.id === 'ical_ota')!
      const carta = result.items.find((i) => i.id === 'carta_digital')!
      expect(ical.status).toBe('na')
      expect(carta.status).toBe('na')
    })

    it('Pro: iCal/OTA and Carta Digital should show as Optional (not N/A)', () => {
      const result = computeReadiness(fullPassData(), 'pro')
      const ical = result.items.find((i) => i.id === 'ical_ota')!
      const carta = result.items.find((i) => i.id === 'carta_digital')!
      expect(ical.status).not.toBe('na')
      expect(carta.status).not.toBe('na')
      // They should exist and have a real status (complete or incomplete)
      expect(['complete', 'incomplete']).toContain(ical.status)
      expect(['complete', 'incomplete']).toContain(carta.status)
    })

    it('N/A items should not affect score calculation', () => {
      const data = fullPassData()
      // Even if iCal and Carta Digital would fail, they don't affect Starter score
      data.rooms.forEach((r) => (r.ical_import_url = null))
      data.menuItems = []
      const result = computeReadiness(data, 'starter')
      // All required checks pass → score 100
      expect(result.score).toBe(100)
      // N/A items still show na status
      const ical = result.items.find((i) => i.id === 'ical_ota')!
      expect(ical.status).toBe('na')
    })
  })
})

// ─── resolveCheck ───────────────────────────────────────────────

describe('resolveCheck', () => {
  describe('existing Required check — pass scenario', () => {
    const result = resolveCheck(fullPassData(), 'starter', 'hotel_identity')

    it('should return a result', () => {
      expect(result).not.toBeNull()
    })

    it('should have complete status', () => {
      expect(result!.status).toBe('complete')
    })

    it('should include details', () => {
      expect(result!.details).toBeTruthy()
    })

    it('should include suggested action', () => {
      expect(result!.suggestedAction).toBeTruthy()
    })
  })

  describe('existing Required check — fail scenario', () => {
    const data = fullPassData()
    data.hotel.wompi_public_key = null
    const result = resolveCheck(data, 'starter', 'payment_gateway')

    it('should have incomplete status', () => {
      expect(result!.status).toBe('incomplete')
    })

    it('should mention which key is missing', () => {
      expect(result!.details).toMatch(/llave pública|WOMPI_PUBLIC_KEY|FALTANTE/i)
    })

    it('should suggest configuring Wompi keys', () => {
      expect(result!.suggestedAction).toMatch(/Wompi/i)
    })
  })

  describe('N/A check for plan', () => {
    it('should return na status for iCal/OTA on Starter', () => {
      const result = resolveCheck(fullPassData(), 'starter', 'ical_ota')
      expect(result!.status).toBe('na')
      expect(result!.details).toMatch(/no aplica/i)
    })

    it('should return na status for Carta Digital on Starter', () => {
      const result = resolveCheck(fullPassData(), 'starter', 'carta_digital')
      expect(result!.status).toBe('na')
    })
  })

  describe('Optional check — pass and fail', () => {
    it('should resolve iCal/OTA as incomplete when no URL set (Pro)', () => {
      const data = fullPassData()
      data.rooms.forEach((r) => (r.ical_import_url = null))
      const result = resolveCheck(data, 'pro', 'ical_ota')
      expect(result!.status).toBe('incomplete')
    })

    it('should resolve iCal/OTA as complete when URL is set (Pro)', () => {
      const data = fullPassData()
      data.rooms[0].ical_import_url = 'https://ical.example.com/feed.ics'
      const result = resolveCheck(data, 'pro', 'ical_ota')
      expect(result!.status).toBe('complete')
    })
  })

  describe('unknown check ID', () => {
    it('should return null for non-existent check', () => {
      const result = resolveCheck(fullPassData(), 'starter', 'nonexistent_check')
      expect(result).toBeNull()
    })
  })

  describe('per-check diagnostic details', () => {
    it('room_with_price should mention room names without price', () => {
      const data = fullPassData()
      data.rooms = [
        { id: 'r1', name: 'Suite', price: 0, ical_import_url: null },
        { id: 'r2', name: 'Estándar', price: 0, ical_import_url: null },
      ]
      const result = resolveCheck(data, 'starter', 'room_with_price')
      expect(result!.status).toBe('incomplete')
      expect(result!.details).toMatch(/Suite/)
      expect(result!.details).toMatch(/Estándar/)
    })

    it('room_unit_limit should show current count vs max', () => {
      const data = fullPassData()
      data.rooms = Array.from({ length: 5 }, (_, i) => ({
        id: `r${i}`,
        name: `Room ${i}`,
        price: 100,
        ical_import_url: null,
      }))
      const result = resolveCheck(data, 'starter', 'room_unit_limit')
      expect(result!.status).toBe('incomplete')
      expect(result!.details).toMatch(/5/)
      expect(result!.details).toMatch(/4/) // maxUnits for starter
    })

    it('staff_invited should show count and limit', () => {
      const data = fullPassData()
      data.staff = []
      const result = resolveCheck(data, 'starter', 'staff_invited')
      expect(result!.status).toBe('incomplete')
      expect(result!.details).toMatch(/0/)
    })

    it('cancellation_policy should show current policy text', () => {
      const data = fullPassData()
      const result = resolveCheck(data, 'starter', 'cancellation_policy')
      expect(result!.status).toBe('complete')
      expect(result!.details).toMatch(/Cancelación gratuita/)
    })
  })
})
