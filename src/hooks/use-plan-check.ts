/**
 * usePlanCheck — Client Hook for Plan Gating
 *
 * Checks if the current hotel has access to a specific feature.
 * Used in client components to conditionally render features or show upgrade prompts.
 *
 * Usage:
 *   const { hasAccess, loading, currentPlan } = usePlanCheck(hotelId, 'channel_manager')
 *
 *   if (loading) return <Skeleton />
 *   if (!hasAccess) return <UpgradePrompt currentPlan={currentPlan} requiredPlan="pro" feature="Channel Manager" />
 *   return <ChannelManagerFeature />
 */

'use client'

import { useState, useEffect } from 'react'
import { checkPlanAccess, getHotelPlanAction } from '@/app/actions/plan-actions'
import type { PlanKey } from '@/config/saas-plans'

interface UsePlanCheckResult {
  hasAccess: boolean | null
  loading: boolean
  currentPlan: PlanKey | null
  reason: string | null
  availableIn: PlanKey | null
}

export function usePlanCheck(hotelId: string, feature: string): UsePlanCheckResult {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState<PlanKey | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [availableIn, setAvailableIn] = useState<PlanKey | null>(null)

  useEffect(() => {
    if (!hotelId || !feature) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function check() {
      try {
        const result = await checkPlanAccess(hotelId, feature)

        if (!cancelled) {
          setHasAccess(result.ok)
          setCurrentPlan(result.currentPlan as PlanKey | null)
          setReason(result.reason || null)
          setAvailableIn(result.availableIn || null)
        }
      } catch {
        if (!cancelled) {
          setHasAccess(false)
          setReason('Error verificando acceso')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [hotelId, feature])

  return { hasAccess, loading, currentPlan, reason, availableIn }
}

/**
 * Hook to get the current hotel's plan info.
 */
export function useHotelPlan(hotelId: string) {
  const [plan, setPlan] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hotelId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetch() {
      try {
        const result = await getHotelPlanAction(hotelId)

        if (!cancelled && result.ok) {
          setPlan(result.plan || null)
          setStatus(result.status || null)
          setTrialEndsAt(result.trialEndsAt || null)
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetch()

    return () => {
      cancelled = true
    }
  }, [hotelId])

  return { plan, status, trialEndsAt, loading }
}
