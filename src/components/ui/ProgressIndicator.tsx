'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ProgressIndicatorProps {
  currentStep: number;
  steps?: string[];
  className?: string;
}

const defaultSteps = ['Datos', 'Pago', 'Confirmación'];

export function ProgressIndicator({
  currentStep,
  steps = defaultSteps,
  className,
}: ProgressIndicatorProps) {
  return (
    <nav aria-label="Checkout progress" className={cn('w-full', className)}>
      <ol className="flex items-center justify-between" role="list">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isPending = stepNumber > currentStep;

          return (
            <li
              key={label}
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}
              data-step-state={isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}
              className="flex flex-1 items-center last:flex-none"
            >
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  className={cn(
                    'size-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                    isCompleted && 'bg-secondary text-secondary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                    isPending && 'bg-muted text-muted-foreground'
                  )}
                  initial={isCurrent ? { scale: 0.9 } : undefined}
                  animate={isCurrent ? { scale: 1 } : undefined}
                >
                  {isCompleted ? <Check size={14} /> : stepNumber}
                </motion.div>
                <span
                  className={cn(
                    'text-xs font-semibold',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="h-px flex-1 bg-border mx-4" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
