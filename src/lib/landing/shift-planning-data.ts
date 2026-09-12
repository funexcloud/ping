import type { ProductPingLandingContent } from "@/content/seo/products-ping-types";

/** Client Component로 넘길 수 있는 plain `theShift` 필드만 */
export type ShiftPlanningShiftData = {
  beforeTitle: string;
  beforeItems: string[];
  afterTitle: string;
  afterItems: string[];
  timeBadge: string;
  demoHint: string;
};

export function pickShiftPlanningData(
  shift: ProductPingLandingContent["theShift"],
): ShiftPlanningShiftData {
  return {
    beforeTitle: shift.beforeTitle,
    beforeItems: [...shift.beforeItems],
    afterTitle: shift.afterTitle,
    afterItems: [...shift.afterItems],
    timeBadge: shift.timeBadge,
    demoHint: shift.demoHint,
  };
}
