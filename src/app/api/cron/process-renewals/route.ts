/**
 * Process Renewals — Cron Job
 *
 * Runs daily via Vercel Cron or QStash.
 * Finds subscriptions expiring in the next 24 hours and:
 * 1. Creates a new invoice for the next period
 * 2. Generates a Wompi payment link
 * 3. Sends email to hotelier with payment link
 *
 * Security: Requires CRON_SECRET in Authorization header.
 *
 * Schedule: Daily at 00:00 UTC (7:00 PM Colombia)
 */

export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SAAS_PLANS, type PlanKey } from '@/config/saas-plans'

// ─── Supabase Admin Client ────────────────────────────────────

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Cron Handler ─────────────────────────────────────────────

export async function GET(req: Request) {
  // ─── Auth: Vercel Cron or manual with CRON_SECRET ───────────
  const authHeader = req.headers.get('authorization')
  const isVercelCron = req.headers.get('x-vercel-cron') === 'true'

  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()

  // ─── Find subscriptions expiring in next 24 hours ───────────
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data: expiringSubs, error } = await supabase
    .from('saas_subscriptions')
    .select(`
      *,
      hotels (
        id,
        name,
        email,
        owner_id
      )
    `)
    .eq('status', 'active')
    .lte('current_period_end', tomorrow)
    .eq('cancel_at_period_end', false)

  if (error) {
    console.error('[Renewals Cron] Error fetching expiring subscriptions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!expiringSubs?.length) {
    return NextResponse.json({ processed: 0, message: 'No subscriptions expiring' }, { status: 200 })
  }

  let processed = 0
  const results: Array<{ hotelId: string; status: string; error?: string }> = []

  for (const sub of expiringSubs) {
    try {
      const plan = SAAS_PLANS[sub.plan_key as PlanKey]
      if (!plan) {
        results.push({ hotelId: sub.hotel_id, status: 'error', error: `Unknown plan: ${sub.plan_key}` })
        continue
      }

      // ─── Step 1: Create new invoice ─────────────────────────
      const now = new Date()
      const periodStart = new Date(sub.current_period_end)
      const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000)

      const { data: invoice, error: invoiceError } = await supabase
        .from('billing_invoices')
        .insert({
          hotel_id: sub.hotel_id,
          plan_key: sub.plan_key,
          plan_fee: plan.priceCOP,
          total: plan.priceCOP,
          status: 'pending',
          due_date: periodStart.toISOString(),
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          wompi_reference: `renewal-${sub.hotel_id}-${Date.now()}`,
        })
        .select()
        .single()

      if (invoiceError) {
        console.error(`[Renewals Cron] Error creating invoice for hotel ${sub.hotel_id}:`, invoiceError)
        results.push({ hotelId: sub.hotel_id, status: 'error', error: invoiceError.message })
        continue
      }

      // ─── Step 2: Generate Wompi payment link ────────────────
      const wompiUrl = generateWompiPaymentLink(invoice, plan)

      // ─── Step 3: Send email to hotelier ─────────────────────
      const hotelEmail = sub.hotels?.email
      const hotelName = sub.hotels?.name || sub.hotel_id

      if (hotelEmail) {
        await sendRenewalEmail(hotelEmail, hotelName, plan.label, plan.priceCOP, wompiUrl, periodEnd)
      }

      // ─── Step 4: Log the renewal attempt ────────────────────
      const { logAuditEvent } = await import('@/lib/audit-logger')
      await logAuditEvent({
        actor_type: 'cron',
        actor_id: 'renewals-cron',
        action: 'renewal_invoice_created',
        entity_type: 'subscription',
        entity_id: sub.hotel_id,
        new_value: {
          invoice_id: invoice.id,
          plan: sub.plan_key,
          amount: plan.priceCOP,
          due_date: periodStart.toISOString(),
          wompi_reference: invoice.wompi_reference,
        },
      })

      processed++
      results.push({ hotelId: sub.hotel_id, status: 'success' })
    } catch (error) {
      console.error(`[Renewals Cron] Failed for hotel ${sub.hotel_id}:`, error)
      results.push({
        hotelId: sub.hotel_id,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({
    processed,
    total: expiringSubs.length,
    results,
  }, { status: 200 })
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Generate a Wompi payment link for an invoice.
 */
function generateWompiPaymentLink(invoice: any, plan: { priceCOP: number; label: string }): string {
  const publicKey = process.env.WOMPI_PLATFORM_PUBLIC_KEY || process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY

  if (!publicKey) {
    console.error('[Renewals Cron] WOMPI_PLATFORM_PUBLIC_KEY not configured')
    return '#'
  }

  const amountInCents = Math.round(plan.priceCOP * 100)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUrl = `${appUrl}/dashboard/billing/success?invoice=${invoice.id}`

  return (
    `https://checkout.wompi.co/p/?` +
    `public-key=${encodeURIComponent(publicKey)}` +
    `&currency=COP` +
    `&amount-in-cents=${amountInCents}` +
    `&reference=${encodeURIComponent(invoice.wompi_reference)}` +
    `&redirect-url=${encodeURIComponent(redirectUrl)}`
  )
}

/**
 * Send renewal email to hotelier.
 * In production: use Resend, SendGrid, or Supabase Edge Function.
 */
async function sendRenewalEmail(
  email: string,
  hotelName: string,
  planLabel: string,
  amount: number,
  paymentUrl: string,
  periodEnd: Date
): Promise<void> {
  // TODO: Replace with actual email service (Resend, SendGrid, etc.)
  // For now: log the email that would be sent

  const subject = `Recordatorio de pago — HospedaSuite ${planLabel}`
  const body = `
    Hola ${hotelName},

    Tu suscripción a HospedaSuite (${planLabel}) vence el ${periodEnd.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}.

    Monto: $${amount.toLocaleString('es-CO')} COP
    Pagar ahora: ${paymentUrl}

    Si ya realizaste el pago, puedes ignorar este email.

    Saludos,
    Equipo HospedaSuite
  `

  console.log(`[EmailQueued] To: ${email} | Subject: ${subject}`)
  console.log(`[EmailQueued] Body: ${body}`)

  // In production:
  // await resend.emails.send({
  //   from: 'HospedaSuite <facturacion@hospedasuite.com>',
  //   to: email,
  //   subject,
  //   html: body,
  // })
}
