"use client";

import { LandingDisplayTitle } from "@/components/landing/LandingDisplayTitle";
import { InfiniteBentoPan, type InfiniteBentoPanProps } from "@/components/ui/infinite-bento-pan";
import {
  LANDING_SECTION_EYEBROWS,
  LANDING_SHIFT_ITERATION_LEAD,
  LANDING_SHIFT_ITERATION_TITLE,
  LANDING_TITLE_BREAKS,
} from "@/content/landing/landing-config";
import { Player } from "@remotion/player";
import { useMemo } from "react";

/** `#the-shift` — 2000시간+ 개발 기록 Infinite Bento Pan */
export function ShiftIterationBento() {
  const inputProps = useMemo<InfiniteBentoPanProps>(
    () => ({
      speed: 1,
      panSpeed: 1,
      accentColor: "#7c3aed",
    }),
    [],
  );

  return (
    <div className="ping-saas-shift-iteration">
      <div className="ping-saas-shift-iteration__head">
        <p className="ping-saas-label">{LANDING_SECTION_EYEBROWS.iteration}</p>
        <LandingDisplayTitle
          as="p"
          className="ping-saas-shift-iteration__title"
          title={LANDING_SHIFT_ITERATION_TITLE}
          breakAfter={LANDING_TITLE_BREAKS.iteration}
        />
        <p className="ping-saas-shift-iteration__lead">{LANDING_SHIFT_ITERATION_LEAD}</p>
      </div>
      <div className="ping-saas-shift-iteration__player ping-bordered-panel min-w-0 max-w-full overflow-hidden p-0">
        <Player
          component={InfiniteBentoPan}
          inputProps={inputProps}
          durationInFrames={240}
          fps={30}
          compositionWidth={1280}
          compositionHeight={720}
          autoPlay
          loop
          controls={false}
          clickToPlay={false}
          style={{
            width: "100%",
            height: "auto",
            aspectRatio: "16 / 9",
            display: "block",
            background: "#050505",
          }}
        />
      </div>
    </div>
  );
}
