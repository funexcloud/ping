"use client";

import { SpecialText } from "@/components/ui/special-text";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import {
  LANDING_FEATURES_SPECIAL_LINES,
  LANDING_FEATURES_VERIFIED_LABEL,
} from "@/content/landing/landing-config";
import { cn } from "@/lib/utils";
import { useInView } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const LINE_PAUSE_MS = 500;

const specialTextClassName =
  "font-ping text-2xl font-bold tracking-tight text-[var(--saas-text)] sm:text-3xl md:text-4xl";

/** 최종 CTA 배너 직전 — Verified + 디코더 텍스트 (한 줄씩 순차) */
export function FeaturesSpecialTextBanner() {
  const rootRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(rootRef, { once: true, margin: "-80px" });
  const [activeIndex, setActiveIndex] = useState(0);
  const [sequenceStarted, setSequenceStarted] = useState(false);

  useEffect(() => {
    if (isInView) setSequenceStarted(true);
  }, [isInView]);

  const onLineComplete = useCallback(() => {
    if (activeIndex >= LANDING_FEATURES_SPECIAL_LINES.length - 1) return;
    window.setTimeout(() => {
      setActiveIndex((prev) => prev + 1);
    }, LINE_PAUSE_MS);
  }, [activeIndex]);

  return (
    <div ref={rootRef} className="landing-features-special-text ping-saas-shell">
      <span className="landing-features-special-text__verified">
        <span className="landing-features-special-text__brand">{LANDING_FEATURES_VERIFIED_LABEL}</span>
        <VerifiedBadge variant="shimmer" size={22} aria-label="검증된 서비스" />
      </span>
      <div
        className="landing-features-special-text__lines"
        aria-live="polite"
        style={{ minHeight: `${LANDING_FEATURES_SPECIAL_LINES.length * 3.5}rem` }}
      >
        {LANDING_FEATURES_SPECIAL_LINES.map((line, index) => {
          if (index > activeIndex) return null;

          if (index < activeIndex) {
            return (
              <span key={line} className={cn("inline-flex min-h-[1.25rem]", specialTextClassName)}>
                {line}
              </span>
            );
          }

          return (
            <SpecialText
              key={line}
              className={specialTextClassName}
              animate={sequenceStarted}
              speed={24}
              onComplete={onLineComplete}
            >
              {line}
            </SpecialText>
          );
        })}
      </div>
    </div>
  );
}
