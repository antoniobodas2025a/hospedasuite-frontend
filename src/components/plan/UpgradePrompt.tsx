/**
 * Upgrade Prompt — Plan Gating UI Component
 *
 * Displayed when a user tries to access a feature their plan doesn't include.
 * Shows current plan, required plan, and upgrade CTA.
 *
 * Usage:
 *   <UpgradePrompt
 *     currentPlan="starter"
 *     requiredPlan="pro"
 *     feature="Channel Manager"
 *   />
 */

'use client'

import { useRouter } from 'next/navigation'
import { SAAS_PLANS, type PlanKey } from '@/config/saas-plans'
import { ArrowUpRight, Lock, Sparkles } from 'lucide-react'

interface UpgradePromptProps {
  currentPlan: PlanKey
  requiredPlan: PlanKey
  feature: string
  className?: string
}

export default function UpgradePrompt({
  currentPlan,
  requiredPlan,
  feature,
  className = '',
}: UpgradePromptProps) {
  const router = useRouter()
  const current = SAAS_PLANS[currentPlan]
  const required = SAAS_PLANS[requiredPlan]

  return (
    <div className={`rounded-[var(--radius-squircle-2xl)] border border-border/50 bg-card/50 backdrop-blur-sm p-8 text-center ${className}`}>
      {/* Icon */}
      <div className="w-14 h-14 rounded-[var(--radius-squircle-xl)] bg-muted/50 flex items-center justify-center mx-auto mb-5">
        <Lock size={24} className="text-muted-foreground" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold tracking-tight mb-2">
        Funcionalidad no disponible
      </h3>

      {/* Description */}
      <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
        <strong className="text-foreground">{feature}</strong> requiere el plan{' '}
        <strong className="text-foreground">{required.label}</strong>.
        Tu plan actual es <strong className="text-foreground">{current.label}</strong>.
      </p>

      {/* Plan Comparison */}
      <div className="flex items-center justify-center gap-6 mb-8 text-sm">
        <div className="text-center">
          <div className="text-muted-foreground mb-1">Tu plan</div>
          <div className="font-semibold">{current.label}</div>
          <div className="text-muted-foreground">${current.priceCOP.toLocaleString('es-CO')}/mes</div>
        </div>
        <div className="text-muted-foreground">
          <ArrowUpRight size={16} />
        </div>
        <div className="text-center">
          <div className="text-muted-foreground mb-1">Upgrade a</div>
          <div className="font-semibold text-primary">{required.label}</div>
          <div className="text-muted-foreground">${required.priceCOP.toLocaleString('es-CO')}/mes</div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push(`/dashboard/billing?upgrade=${requiredPlan}`)}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full font-medium text-[15px] hover:opacity-90 transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 active:scale-[0.97]"
      >
        <Sparkles size={16} />
        Upgrade a {required.label}
        <ArrowUpRight size={16} className="opacity-50" />
      </button>

      {/* Secondary CTA */}
      <div className="mt-4">
        <button
          onClick={() => router.push('/software#precios')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver todos los planes
        </button>
      </div>
    </div>
  )
}
