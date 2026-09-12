"use client";

import { ShiftFlowSwipe } from "@/components/landing/ShiftFlowSwipe";
import AgentPlanning, { buildShiftPlanningSteps } from "@/components/ui/ai-planning";
import type { ShiftPlanningShiftData } from "@/lib/landing/shift-planning-data";

/** `#the-shift` — Before/After 스켈레톤 플로우 + AgentPlanning 타임라인 */
export function ShiftPlanningTimeline({ shift }: { shift: ShiftPlanningShiftData }) {
  const steps = buildShiftPlanningSteps(shift);

  return (
    <div className="ping-saas-shift-planning space-y-6">
      <ShiftFlowSwipe hideHeader />
      <AgentPlanning title="발송 방식을 이렇게 바꿨습니다" steps={steps} />
    </div>
  );
}
