import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id: number;
  label: string;
  description?: string;
}

interface StepProgressProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  currentStep,
  onStepClick,
  className = ''
}) => {
  return (
    <div className={`w-full py-4 ${className}`}>
      {/* Desktop Stepper */}
      <div className="hidden sm:flex items-center justify-between relative">
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-800 -z-0" />
        <div
          className="absolute top-4 left-6 h-0.5 bg-emerald-500 transition-all duration-300 -z-0"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`
          }}
        />

        {steps.map(step => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = Boolean(onStepClick);

          return (
            <div
              key={step.id}
              onClick={() => isClickable && onStepClick?.(step.id)}
              className={`flex flex-col items-center relative z-10 select-none ${
                isClickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all duration-200 border-2 ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : isCurrent
                    ? 'bg-slate-950 border-emerald-400 text-emerald-400 ring-4 ring-emerald-500/20'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.id}
              </div>

              <span
                className={`mt-2 text-xs font-medium tracking-tight whitespace-nowrap ${
                  isCurrent
                    ? 'text-white font-bold'
                    : isCompleted
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>

              {step.description && (
                <span className="text-[10px] text-slate-400 hidden md:block">
                  {step.description}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Stepper Bar */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white">
            Step {currentStep} of {steps.length}: <span className="text-emerald-400">{steps[currentStep - 1]?.label}</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {Math.round((currentStep / steps.length) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
