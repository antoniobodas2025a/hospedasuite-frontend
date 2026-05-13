/**
 * MAC 2026 — Spring Physics Animation Config
 * Centralized spring presets for consistent motion across the OTA.
 * All values tuned for natural, physics-based feel.
 *
 * Usage: import { springSnappy, springGentle, springBounce } from '@/lib/animations'
 */

export const springSnappy = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
  restSpeed: 0.01,
  restDelta: 0.001,
}

export const springGentle = {
  type: 'spring' as const,
  stiffness: 250,
  damping: 25,
  mass: 1.0,
  restSpeed: 0.01,
  restDelta: 0.001,
}

export const springBounce = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 18,
  mass: 0.6,
  restSpeed: 0.01,
  restDelta: 0.001,
}

export const springIndicator = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 24,
  mass: 0.8,
  restSpeed: 0.01,
  restDelta: 0.001,
}

export const springPopover = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
  mass: 0.9,
  restSpeed: 0.01,
  restDelta: 0.001,
}

export const springShake = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 12,
  mass: 0.5,
  restSpeed: 0.01,
  restDelta: 0.001,
}

/**
 * Visual haptic feedback — used for error states
 * Returns a shake animation config with N cycles
 */
export function getShakeAnimation(cycles = 3) {
  return {
    x: [0, -8, 8, -6, 6, -4, 4, 0],
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 12,
      mass: 0.5,
      duration: 0.5 * cycles,
    },
  }
}

/**
 * Progressive disclosure animation — content reveal
 */
export const springReveal = {
  initial: { opacity: 0, y: 12, scale: 0.98 } as const,
  animate: { opacity: 1, y: 0, scale: 1 } as const,
  exit: { opacity: 0, y: -8, scale: 0.98 } as const,
  transition: springGentle,
}

/**
 * Micro-interaction: button press
 */
export const springPress = {
  whileTap: { scale: 0.96 },
  whileHover: { scale: 1.02 },
  transition: springSnappy,
}
