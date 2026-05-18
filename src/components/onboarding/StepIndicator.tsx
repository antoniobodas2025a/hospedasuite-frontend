'use client';

import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  maxCompletedStep: number;
  steps: { number: number; label: string }[];
  onStepClick?: (step: number) => void;
}

export default function StepIndicator({ currentStep, maxCompletedStep, steps, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-12">
      {steps.map((step, idx) => (
        <div key={step.number} className="flex items-center">
          <button
            onClick={() => onStepClick?.(step.number)}
            disabled={step.number > maxCompletedStep + 1}
            className={`
              relative flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all
              ${step.number < currentStep ? 'bg-emerald-500 text-white cursor-pointer' : ''}
              ${step.number === currentStep ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/20' : ''}
              ${step.number > currentStep && step.number <= maxCompletedStep + 1 ? 'bg-white/10 text-zinc-400 cursor-pointer hover:bg-white/20' : ''}
              ${step.number > maxCompletedStep + 1 ? 'bg-white/5 text-zinc-700 cursor-not-allowed' : ''}
            `}
          >
            {step.number < currentStep ? (
              <Check size={16} />
            ) : (
              step.number
            )}
          </button>
          <span className={`absolute -bottom-6 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap
            ${step.number === currentStep ? 'text-indigo-400' : 'text-zinc-600'}
          `}>
            {step.label}
          </span>
          {idx < steps.length - 1 && (
            <div className={`w-12 h-0.5 mx-2 transition-colors ${
              step.number < currentStep ? 'bg-emerald-500' : 'bg-white/10'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}
