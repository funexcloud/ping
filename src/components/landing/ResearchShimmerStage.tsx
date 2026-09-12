"use client";

import { TextShimmer } from "@/components/ui/shimmer-text";
import { LANDING_RESEARCH_STAGES } from "@/content/landing/landing-config";

type ResearchShimmerStageProps = {
  panelOnly?: boolean;
};

/** 연구 1단계 — 고민(Shimmer) */
export function ResearchShimmerStage({ panelOnly = false }: ResearchShimmerStageProps) {
  const s = LANDING_RESEARCH_STAGES.think;

  return (
    <div className="research-stage research-stage--shimmer">
      {!panelOnly ? (
        <>
          <p className="research-stage__label">{s.label}</p>
          <p className="research-stage__caption">{s.caption}</p>
        </>
      ) : null}
      <div className="research-stage__panel">
        <TextShimmer className="font-light text-base tracking-tight md:text-[0.9375rem]">
          {s.shimmer}
        </TextShimmer>
      </div>
    </div>
  );
}
