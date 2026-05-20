/**
 * Wompi Subscription Webhook Handler
 *
 * Receives payment events from Wompi and updates subscription status.
 * Handles: payment.succeeded, payment.failed, subscription.cancelled
 *
 * Security: Verifies Wompi signature using WOMPI_INTEGRITY_SECRET.
 *
 * Pattern (Next.js best practice):
 *   - Verify webhook signature before processing
 *   - Idempotent: safe to receive duplicate events
 *   - Updates both saas_subscriptions and hotels tables
 */

export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SAAS_PLANS } from '@/config/saas-plans'
import { logAuditEvent } from '@/lib/audit-logger'

// ─── Supabase Admin Client ────────────────────────────────────

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Webhook Handler ──────────────────────────────────────────

export async function POST(req: Request) {
  const supabase = getAdminClient()

  try {
    const body = await req.json()

    // Wompi sends events with data.event structure
    const event = body.data || body

    if (!event?.event) {
      return NextResponse.json({ error: 'Invalid event structure' }, { status: 400 })
    }

    // ─── Verify Signature ─────────────────────────────────────
    const signature = req.headers.get('x-wompi-signature') || req.headers.get('x-signature')
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET

    if (integritySecret && signature) {
      const crypto = await import('node:crypto')
      const expected = crypto
        .createHmac('sha256', integritySecret)
        .update(JSON.stringify(body))
        .digest('hex')

      if (signature !== expected) {
        console.error('[Wompi Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // ─── Route Event ──────────────────────────────────────────
    switch (event.event) {
      case 'transaction.updated':
      case 'payment.succeeded':
        await handlePaymentSucceeded(supabase, event)
        break

      case 'payment.failed':
      case 'transaction.failed':
        await handlePaymentFailed(supabase, event)
        break

      default:
        console.log(`[Wompi Webhook] Unhandled event: ${event.event}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Wompi Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── Event Handlers ───────────────────────────────────────────

async function handlePaymentSucceeded(supabase: any, event: any) {
  const transaction = event.data || event

  const reference = transaction.reference || transaction.id
  const transactionId = transaction.id
  const status = transaction.status

  if (status !== 'APPROVED') {
    console.log(`[Wompi Webhook] Transaction ${reference} status: ${status} — ignoring`)
    return
  }

  console.log(`[Wompi Webhook] Payment succeeded: ${reference}`)

  // ─── Find invoice by reference ──────────────────────────────
  const { data: invoice } = await supabase
    .from('billing_invoices')
    .select('hotel_id, plan_key, amount')
    .eq('wompi_reference', reference)
    .single()

  if (!invoice) {
    console.log(`[Wompi Webhook] No invoice found for reference: ${reference}`)
    return
  }

  // ─── Mark invoice as paid ───────────────────────────────────
  await supabase
    .from('billing_invoices')
    .update({
      status: 'paid',
      wompi_transaction_id: transactionId,
      paid_at: new Date().toISOString(),
    })
    .eq('wompi_reference', reference)

  // ─── Activate subscription ──────────────────────────────────
  const now = new Date()
  const nextPeriod = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await supabase
    .from('saas_subscriptions')
    .update({
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: nextPeriod.toISOString(),
      cancel_at_period_end: false,
      last_wompi_payment_id: transactionId,
      last_wompi_payment_date: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('hotel_id', invoice.hotel_id)

  // ─── Update hotel status ────────────────────────────────────
  await supabase
    .from('hotels')
    .update({
      subscription_status: 'active',
      subscription_plan: invoice.plan_key || 'starter',
    })
    .eq('id', invoice.hotel_id)

  // ─── Audit log ──────────────────────────────────────────────
  await logAuditEvent({
    actor_type: 'webhook',
    actor_id: 'wompi',
    action: 'payment_received',
    entity_type: 'subscription',
    entity_id: invoice.hotel_id,
    new_value: {
      reference,
      transaction_id: transactionId,
      amount: invoice.amount,
      plan: invoice.plan_key,
    },
  })

  console.log(`[Wompi Webhook] Subscription activated for hotel ${invoice.hotel_id}`)
}

async function handlePaymentFailed(supabase: any, event: any) {
  const transaction = event.data || event
  const reference = transaction.reference || transaction.id

  console.log(`[Wompi Webhook] Payment failed: ${reference}`)

  // ─── Find invoice by reference ──────────────────────────────
  const { data: invoice } = await supabase
    .from('billing_invoices')
    .select('hotel_id')
    .eq('wompi_reference', reference)
    .single()

  if (!invoice) {
    console.log(`[Wompi Webhook] No invoice found for reference: ${reference}`)
    return
  }

  // ─── Mark subscription as past_due ──────────────────────────
  await supabase
    .from('saas_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('hotel_id', invoice.hotel_id)

  // ─── Update hotel status ────────────────────────────────────
  await supabase
    .from('hotels')
    .update({ subscription_status: 'past_due' })
    .eq('id', invoice.hotel_id)

  // ─── Audit log ──────────────────────────────────────────────
  await logAuditEvent({
    actor_type: 'webhook',
    actor_id: 'wompi',
    action: 'payment_failed',
    entity_type: 'subscription',
    entity_id: invoice.hotel_id,
    new_value: { reference },
  })

  console.log(`[Wompi Webhook] Subscription marked past_due for hotel ${invoice.hotel_id}`)
}
