import { ChevronRight } from 'lucide-react';
import type { Step } from '../_types';
import { STEP_ORDER, STEP_LABELS } from '../_types';

export default function WizardProgress({ step }: { step: Step }) {
  if (step === 'receipt') return null;
  const currentIdx = STEP_ORDER.indexOf(step as Exclude<Step, 'receipt'>);

  return (
    <div className="flex items-center gap-2 mb-6 text-sm select-none">
      {STEP_ORDER.map((s, i) => {
        const isDone = i < currentIdx;
        const isCurrent = s === step;
        return (
          <div key={s} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
              isDone ? 'bg-indigo-600 text-white' : isCurrent ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {isDone ? '✓' : i + 1}
            </span>
            <span className={`hidden sm:inline ${isCurrent ? 'text-indigo-700 font-medium' : 'text-gray-400'}`}>
              {STEP_LABELS[s]}
            </span>
            {i < STEP_ORDER.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}
