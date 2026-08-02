/**
 * Centralized motion design tokens.
 *
 * Durations are expressed in milliseconds for easy use with both CSS
 * transitions and Framer Motion (divide by 1000 when needed).
 */
export const MOTION_DURATION = {
  fast: 150,
  normal: 200,
  slow: 300,
} as const;

export const MOTION_EASING = {
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const MOTION_STAGGER = {
  card: 50,
} as const;

export type MotionDuration = keyof typeof MOTION_DURATION;
export type MotionEasing = keyof typeof MOTION_EASING;
