"use client";

import { ShiftIterationBento } from "@/components/landing/ShiftIterationBento";
import { ShiftPlanningTimeline } from "@/components/landing/ShiftPlanningTimeline";
import { ShiftSecurityGlobe } from "@/components/landing/ShiftSecurityGlobe";
import { ShiftSecurityPlanning } from "@/components/landing/ShiftSecurityPlanning";
import type { ShiftPlanningShiftData } from "@/lib/landing/shift-planning-data";

/** `#the-shift` — Client 전용 블록(타임라인·CDN·보안) */
export function TheShiftBodyClient({ shift }: { shift: ShiftPlanningShiftData }) {
  return (
    <>
      <ShiftPlanningTimeline shift={shift} />
      <ShiftSecurityGlobe />
      <ShiftSecurityPlanning />
      <ShiftIterationBento />
    </>
  );
}
