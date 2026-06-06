"use client";

import {
  BULK_FLOW_STEP_COUNT,
  bulkFlowStepLabel,
  bulkFlowStepPercent,
  type BulkFlowStep,
} from "@/lib/ping-bulk-flow-steps";
import { cn } from "@/lib/utils";

export type BulkFlowProgressProps = {
  currentStep: BulkFlowStep;
  /** 답례 문자 등 단계별 표시명 덮어쓰기 */
  labelOverride?: string;
  className?: string;
  /** 헤더 아래 고정(본문만 스크롤되는 화면) */
  sticky?: boolean;
};

export function BulkFlowProgress({
  currentStep,
  labelOverride,
  className,
  sticky = false,
}: BulkFlowProgressProps) {
  const label = bulkFlowStepLabel(currentStep, labelOverride);
  const percent = bulkFlowStepPercent(currentStep);

  return (
    <div
      className={cn(
        "bulk-flow-progress shrink-0 px-5 pb-3 pt-1",
        sticky && "sticky top-0 z-20",
        className,
      )}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={BULK_FLOW_STEP_COUNT}
      aria-valuetext={`${currentStep}단계 / ${BULK_FLOW_STEP_COUNT}, ${label}`}
    >
      <div className="mb-2 flex gap-0.5" aria-hidden="true">
        {Array.from({ length: BULK_FLOW_STEP_COUNT }, (_, i) => {
          const seg = (i + 1) as BulkFlowStep;
          return (
            <span
              key={seg}
              className={cn(
                "h-1 min-w-0 flex-1 rounded-full transition-colors duration-200",
                seg <= currentStep ? "bg-[#3182F6]" : "bg-[#E9ECF0]",
              )}
            />
          );
        })}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 text-[13px] font-semibold leading-snug tracking-tight text-[#191F28]">
          <span className="text-[#3182F6]">{currentStep}</span>
          <span className="font-medium text-[#B0B8C1]"> / {BULK_FLOW_STEP_COUNT}</span>
          <span className="mx-1 font-normal text-[#D1D6DB]" aria-hidden="true">
            ·
          </span>
          <span className="font-semibold text-[#191F28]">{label}</span>
        </p>
        <span
          className="shrink-0 text-[11px] font-medium tabular-nums text-[#B0B8C1]"
          aria-hidden="true"
        >
          {percent}%
        </span>
      </div>
    </div>
  );
}
