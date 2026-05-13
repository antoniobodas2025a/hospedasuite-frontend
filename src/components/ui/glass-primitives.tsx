/**
 * Mac 2026 Glass Primitives
 * Reusable glassmorphism components with depth-aware blur levels.
 * 
 * Pillar 3: Estética Mac 2026 — Glassmorphism 2.0
 * - Light glass: cards, panels (blur 24px, 40% surface)
 * - Heavy glass: modals, overlays (blur 40px, 8% surface)
 * - Pill glass: nav bars, floating elements (blur 20px, 60% surface)
 * All with 1px specular border and inset highlight.
 */

import { cn } from '@/lib/utils'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { springSnappy } from '@/lib/mac2026/spring'

// ─── GlassCard (Level 1: Light glass) ───────────────────────────
// Use for: room cards, review cards, info panels

export function GlassCard({
  className,
  children,
  interactive = false,
  ...props
}: HTMLMotionProps<'div'> & { interactive?: boolean }) {
  return (
    <motion.div
      className={cn(
        'glass-card',
        interactive && 'transition-transform active:scale-[0.98] hover:scale-[1.01]',
        className,
      )}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={springSnappy()}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// ─── GlassPanel (Level 2: Heavy glass) ──────────────────────────
// Use for: modals, overlays, room showcase modal

export function GlassPanel({
  className,
  children,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      className={cn('glass-panel', className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// ─── GlassPill (Level 3: Pill glass) ────────────────────────────
// Use for: sticky sub-nav, floating CTAs, search bar pills

export function GlassPill({
  className,
  children,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      className={cn('glass-pill', className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// ─── SquircleButton ─────────────────────────────────────────────
// Button with squircle corners + spring press feedback

export function SquircleButton({
  className,
  children,
  variant = 'primary',
  size = 'md',
  ...props
}: HTMLMotionProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  }

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground shadow-elev-2 hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground shadow-elev-1 hover:bg-secondary/80',
    ghost: 'bg-transparent hover:bg-muted/50',
  }

  return (
    <motion.button
      className={cn(
        'rounded-[var(--radius-squircle-md)] font-medium',
        'transition-colors active:scale-[0.96]',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      transition={springSnappy()}
      {...props}
    >
      {children}
    </motion.button>
  )
}
