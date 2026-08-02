'use client';

import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOTION_DURATION, MOTION_EASING } from '@/lib/motion-tokens';

export interface CelebrationAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
  className?: string;
}

const PARTICLE_COUNT = 24;
const PARTICLE_COLORS = [
  'bg-brand-500',
  'bg-secondary',
  'bg-warning',
  'bg-success',
  'bg-pink-500',
  'bg-purple-500',
];

function generateParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
    id: index,
    x: Math.random() * 240 - 120,
    y: Math.random() * -240 - 40,
    rotate: Math.random() * 360,
    color: PARTICLE_COLORS[index % PARTICLE_COLORS.length],
    delay: Math.random() * 0.2,
  }));
}

export function CelebrationAnimation({
  isVisible,
  onComplete,
  className,
}: CelebrationAnimationProps) {
  const prefersReducedMotion = useReducedMotion();
  const particles = useMemo(() => generateParticles(), []);

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      onComplete?.();
    }, 800);
    return () => clearTimeout(timer);
  }, [isVisible, onComplete]);

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      role="status"
      aria-live="polite"
      aria-label="Reserva completada"
    >
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {!prefersReducedMotion &&
              particles.map((particle) => (
                <motion.div
                  key={particle.id}
                  data-testid="confetti-particle"
                  className={cn(
                    'absolute w-2 h-2 rounded-sm',
                    particle.color
                  )}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
                  animate={{
                    x: particle.x,
                    y: particle.y,
                    opacity: 0,
                    scale: 1,
                    rotate: particle.rotate,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: particle.delay,
                    ease: MOTION_EASING.easeOut,
                  }}
                />
              ))}
            <motion.div
              data-testid="celebration-checkmark"
              className="relative z-10 flex items-center justify-center size-16 rounded-full bg-success text-success-foreground shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                duration: MOTION_DURATION.normal / 1000,
                ease: MOTION_EASING.easeOut,
              }}
            >
              <Check size={32} strokeWidth={3} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
