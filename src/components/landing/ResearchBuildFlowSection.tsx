"use client";

import { ShiftFlowSwipe } from "@/components/landing/ShiftFlowSwipe";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

/** 연구 3단계(완성) — `#features` SpecialText 바로 위, 스크롤 시 하단에서 등장 */
export function ResearchBuildFlowSection() {
  const rootRef = useRef<HTMLElement>(null);
  const isInView = useInView(rootRef, { once: true, margin: "-12% 0px" });
  const prefersReducedMotion = useReducedMotion();
  const revealed = prefersReducedMotion || isInView;

  return (
    <section ref={rootRef} className="research-build-flow" aria-label="완성 — 이렇게 만들었습니다">
      <div className="ping-saas-shell">
        <motion.div
          className="research-build-flow__motion"
          initial={false}
          animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 64 }}
          transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
        >
          <ShiftFlowSwipe />
        </motion.div>
      </div>
    </section>
  );
}
