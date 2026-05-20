/**
 * Billing Subscriptions — Server Actions
 *
 * Handles subscription upgrades, downgrades, and payment link generation
 * using the new saas_subscriptions table and billing DAL.
 */

'use server'

import { getCurrentHotel } from '@/lib/hotel-context'
import { createSubscription, upgradeSubscription, cancelSubscription } from '@/data/billing'
import { requirePlan } from '@/data/plan-guard'
import { SAAS_PLANS, type PlanKey } from '@/config/saas-plans'
import { revalidatePath } from 'next/cache'
import { logAuditEvent } from '@/lib/audit-logger'

/**
 * Upgrade to a new plan.
 * Creates subscription if none exists, or upgrades existing one.
 */
export async function upgradeSubscriptionAction(
  newPlan: PlanKey
): Promise<{ success: boolean; error?: string; paymentUrl?: string }> {
  try {
    const hotel = await getCurrentHotel()
    if (!hotel) {
      return { success: false, error: 'No autorizado' }
    }

    // Check if upgrade is valid
    const planCheck = await requirePlan(hotel.id, newPlan)
    if (!planCheck.ok && newPlan === hotel.subscription_plan) {
      return { success: false, error: 'Ya estás en este plan' }
    }

    const plan = SAAS_PLANS[newPlan]

    // Check if subscription exists
    const { getActiveSubscription } = await import('@/data/billing')
    const existingSub = await getActiveSubscription(hotel.id)

    if (!existingSub) {
      // Create new subscription
      const result = await createSubscription({
        hotelId: hotel.id,
        planKey: newPlan,
      })

      if (!result.ok) {
        return { success: false, error: result.error }
      }
    } else {
      // Upgrade existing subscription
      const result = await upgradeSubscription(hotel.id, newPlan)

      if (!result.ok) {
        return { success: false, error: result.error }
      }
    }

    // Generate payment link for the new plan
    const { generateBillingPaymentLinkAction } = await import('@/app/actions/billing')
    const paymentResult = await generateBillingPaymentLinkAction(hotel.id, true)

    if (!paymentResult.success || !paymentResult.link) {
      return { success: false, error: 'Error generando enlace de pago' }
    }

    // Audit log
    await logAuditEvent({
      actor_type: 'user',
      actor_id: hotel.id,
      action: 'plan_upgrade_initiated',
      entity_type: 'subscription',
      entity_id: hotel.id,
      old_value: { plan: hotel.subscription_plan },
      new_value: { plan: newPlan, amount: plan.priceCOP },
    })

    revalidatePath('/dashboard/billing')

    return {
      success: true,
      paymentUrl: paymentResult.link.paymentUrl,
    }
  } catch (error: any) {
    console.error('[Billing] Error upgrading subscription:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cancel subscription at end of current period.
 */
export async function cancelSubscriptionAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const hotel = await getCurrentHotel()
    if (!hotel) {
      return { success: false, error: 'No autorizado' }
    }

    const result = await cancelSubscription(hotel.id)

    if (!result.ok) {
      return { success: false, error: result.error }
    }

    // Audit log
    await logAuditEvent({
      actor_type: 'user',
      actor_id: hotel.id,
      action: 'subscription_cancelled',
      entity_type: 'subscription',
      entity_id: hotel.id,
      new_value: { cancel_at_period_end: true },
    })

    revalidatePath('/dashboard/billing')

    return { success: true }
  } catch (error: any) {
    console.error('[Billing] Error cancelling subscription:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get subscription status for the current hotel.
 */
export async function getSubscriptionStatusAction(): Promise<{
  success: boolean
  subscription?: {
    planKey: PlanKey
    status: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
  }
  error?: string
}> {
  try {
    const hotel = await getCurrentHotel()
    if (!hotel) {
      return { success: false, error: 'No autorizado' }
    }

    const { getActiveSubscription } = await import('@/data/billing')
    const sub = await getActiveSubscription(hotel.id)

    if (!sub) {
      return {
        success: true,
        subscription: undefined,
      }
    }

    return {
      success: true,
      subscription: {
        planKey: sub.plan_key,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
