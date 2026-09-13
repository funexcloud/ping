import { START_WIZARD_TOTAL_STEPS } from "@/components/start/start-header";

type StartStepIndicatorProps = {
  currentStep: number;
  totalSteps?: number;
};

export function StartStepIndicator({
  currentStep,
  totalSteps = START_WIZARD_TOTAL_STEPS,
}: StartStepIndicatorProps) {
  return (
    <div
      className="ping-start__progress"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={currentStep}
      aria-label={`발송 ${currentStep} / ${totalSteps} 단계`}
    >
      {Array.from({ length: totalSteps }, (_, index) => (
        <span key={index} className={index < currentStep ? "is-complete" : undefined} />
      ))}
    </div>
  );
}

/** @deprecated Use StartStepIndicator */
export const StartProgress = StartStepIndicator;
