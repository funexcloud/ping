"use client";

import TextTypewriter from "@/components/ui/the-typewriter";
import { LANDING_RESEARCH_STAGES } from "@/content/landing/landing-config";

type ResearchTypewriterStageProps = {
  panelOnly?: boolean;
};

/** 연구 2단계 — 설계(Typewriter) */
export function ResearchTypewriterStage({ panelOnly = false }: ResearchTypewriterStageProps) {
  const s = LANDING_RESEARCH_STAGES.design;

  return (
    <div className="research-stage research-stage--typewriter">
      {!panelOnly ? (
        <>
          <p className="research-stage__label">{s.label}</p>
          <p className="research-stage__caption">{s.caption}</p>
        </>
      ) : null}
      <div className="research-stage__panel">
        <TextTypewriter
          className="font-mono text-base leading-relaxed text-[var(--saas-text)] sm:text-lg"
          duration={2.8}
        >
          {s.typewriter}
        </TextTypewriter>
      </div>
    </div>
  );
}
