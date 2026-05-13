/**
 * Mac 2026 Spring Physics Configuration
 * 
 * Centralized spring presets for consistent, organic motion across the OTA.
 * Every spring uses physics-based parameters (stiffness, damping, mass)
 * instead of linear time curves.
 *
 * Usage:
 *   import { springSnappy, springGentle, springBounce } from '@/lib/mac2026/spring'
 *   <motion.div transition={springSnappy()} />
 */

export type SpringConfig = {
  type: 'spring'
  stiffness: number
  damping: number
  mass: number
  restDelta?: number
  restSpeed?: number
}

/**
 * Snappy — fast response, minimal overshoot.
 * Use for: micro-interactions, button press, toggle switches, indicator slides.
 */
export const springSnappy = (overrides?: Partial<SpringConfig>): SpringConfig => ({
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.8,
  restDelta: 0.001,
  restSpeed: 0.01,
  ...overrides,
})

/**
 * Gentle — smooth, calm transition with soft settling.
 * Use for: panel reveals, progressive disclosure, card expansions.
 */
export const springGentle = (overrides?: Partial<SpringConfig>): SpringConfig => ({
  type: 'spring',
  stiffness: 200,
  damping: 24,
  mass: 1.2,
  restDelta: 0.001,
  restSpeed: 0.01,
  ...overrides,
})

/**
 * Bounce — playful overshoot, energetic feel.
 * Use for: attention-grabbing elements, CTA emphasis, success states.
 */
export const springBounce = (overrides?: Partial<SpringConfig>): SpringConfig => ({
  type: 'spring',
  stiffness: 300,
  damping: 18,
  mass: 1.0,
  restDelta: 0.001,
  restSpeed: 0.01,
  ...overrides,
})

/**
 * Layout — spring optimized for layout shifts (layoutId animations).
 * Use for: active tab indicators, nav pill slides, selection highlights.
 */
export const springLayout = (overrides?: Partial<SpringConfig>): SpringConfig => ({
  type: 'spring',
  stiffness: 300,
  damping: 24,
  mass: 0.8,
  restDelta: 0.001,
  restSpeed: 0.01,
  ...overrides,
})

/**
 * Visual Haptic — shake animation for error feedback.
 * Returns a keyframes config for use with animate={{ x: [...] }}.
 * Usage: <motion.div animate={shakeHaptic()} />
 */
export const shakeHaptic = () => ({
  x: [0, -6, 6, -4, 4, -2, 2, 0],
  transition: {
    type: 'tween' as const,
    duration: 0.5,
    ease: 'easeInOut' as const,
  },
})

/**
 * Desaturate — visual failure feedback without popups.
 * Use with AnimatePresence for organic error states.
 */
export const desaturateFeedback = {
  initial: { filter: 'saturate(1)', scale: 1 },
  animate: { filter: 'saturate(0.6)', scale: 0.98 },
  exit: { filter: 'saturate(1)', scale: 1 },
  transition: springGentle(),
}

/**
 * Progressive disclosure — height + opacity reveal.
 * Use for: accordion sections, detail panels, config reveals.
 */
export const progressiveReveal = {
  hidden: { opacity: 0, height: 0, y: -8 },
  visible: { opacity: 1, height: 'auto', y: 0 },
  exit: { opacity: 0, height: 0, y: -8 },
}

/**
 * Mac 2026 MotionConfig default — apply at root level.
 * Usage: <MotionConfig transition={mac2026Default}>...</MotionConfig>
 */
export const mac2026Default: SpringConfig = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
  mass: 1.0,
  restDelta: 0.001,
  restSpeed: 0.01,
}
