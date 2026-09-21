import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@kalpak/ui';

export interface StepItem {
  id: number;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  className?: string;
}

export function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  return (
    <div className={cn('w-full', className)}>
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between w-full">
          {steps.map((step, index) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;

            return (
              <li
                key={step.id}
                className={cn('relative flex-1', index !== steps.length - 1 && 'pr-4 sm:pr-8')}
              >
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => onStepClick && step.id <= currentStep && onStepClick(step.id)}
                    disabled={!onStepClick || step.id > currentStep}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors shrink-0',
                      isCompleted
                        ? 'bg-sky-600 text-white hover:bg-sky-700'
                        : isCurrent
                          ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-600 font-bold'
                          : 'bg-slate-100 text-slate-400',
                      !onStepClick && 'cursor-default'
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                  </button>

                  {index !== steps.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 ml-2 transition-colors',
                        isCompleted ? 'bg-sky-600' : 'bg-slate-200'
                      )}
                    />
                  )}
                </div>

                <div className="mt-2 hidden sm:block">
                  <span
                    className={cn(
                      'text-xs font-medium block truncate',
                      isCurrent ? 'text-sky-700 font-bold' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
