/**
 * Mac 2026 Glass Primitives
 * 
 * Reusable glassmorphism components with depth-aware blur layers.
 * Three material levels: Card (light), Panel (heavy), Pill (floating).
 * All use semantic tokens from globals.css.
 *
 * Usage:
 *   <GlassCard>Content</GlassCard>
 *   <GlassPanel variant="heavy">Modal content</GlassPanel>
 *   <GlassPill>Floating nav</GlassPill>
 */

import { cn } from '@/lib/utils'
import { HTMLAttributes, forwardRef } from 'react'

export interface GlassProps extends HTMLAttributes<HTMLDivElement> {
  /** Additional blur intensity override */
  intensity?: 'light' | 'medium' | 'heavy'
}

/**
 * GlassCard — Level 1: Light glass for cards, panels, elevated surfaces.
 * Uses 24px blur with 160% saturation. Squircle corners (2rem).
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassProps>(
  ({ className, intensity, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-card',
          intensity === 'medium' && 'backdrop-blur-2xl',
          intensity === 'heavy' && 'backdrop-blur-3xl',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GlassCard.displayName = 'GlassCard'

/**
 * GlassPanel — Level 2: Heavy glass for modals, overlays, deep surfaces.
 * Uses 40px blur with 180% saturation. Squircle corners (2.5rem).
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassProps>(
  ({ className, intensity, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-panel',
          intensity === 'light' && 'backdrop-blur-xl',
          intensity === 'medium' && 'backdrop-blur-2xl',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GlassPanel.displayName = 'GlassPanel'

/**
 * GlassPill — Level 3: Pill glass for nav bars, floating elements.
 * Uses 20px blur with 140% saturation. Squircle corners (1.5rem).
 */
export const GlassPill = forwardRef<HTMLDivElement, GlassProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('glass-pill', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GlassPill.displayName = 'GlassPill'

/**
 * SectionHeader — Mac 2026 section header with active negative space.
 * Uses micro dot indicator + uppercase tracking for visual hierarchy.
 */
export function SectionHeader({
  title,
  subtitle,
  className,
}: {
  title: string
  subtitle?: string
  className?: string
}) {
  return (
    <div className={cn('mb-6', className)}>
      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-brand-400" />
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground/70 ml-3.5">{subtitle}</p>
      )}
    </div>
  )
}
