import { Check } from "lucide-react";
import type { WizardStepMeta } from "./wizardModel";

interface WizardStepperProps {
  /** The active step list — insurance steps vary with the selected coverage. */
  steps: WizardStepMeta[];
  /** 0-based index of the active step. */
  current: number;
  /** Highest step the user has reached (for enabling back-navigation). */
  maxReached: number;
  onStepClick: (index: number) => void;
}

/**
 * Horizontal step indicator for the Add-Patient wizard. Completed steps are
 * clickable (to jump back); future steps are locked until reached.
 */
export default function WizardStepper({ steps, current, maxReached, onStepClick }: WizardStepperProps) {
  return (
    <div className="bg-white border-b border-[#E2E8F0] px-6 py-3">
      <div className="max-w-[1600px] mx-auto flex items-center gap-2 overflow-x-auto">
        {steps.map((step, i) => {
          const isActive = i === current;
          const isDone = i < current;
          const isReachable = i <= maxReached;
          return (
            <div key={step.id} className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => isReachable && onStepClick(i)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-[#1F3A5F] text-white font-semibold"
                    : isReachable
                      ? "text-[#1F3A5F] hover:bg-[#F1F5F9]"
                      : "text-[#94A3B8] cursor-not-allowed"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-white text-[#1F3A5F]"
                      : isDone
                        ? "bg-[#2FB9A7] text-white"
                        : "bg-[#E2E8F0] text-[#64748B]"
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : i + 1}
                </span>
                <span className="whitespace-nowrap">{step.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className="w-6 h-px bg-[#E2E8F0] shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
