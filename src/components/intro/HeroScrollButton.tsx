"use client";

import { ChevronDown } from "lucide-react";
import { MAGIC_SECTIONS } from "@/lib/intro/config";

type Props = {
  targetId?: string;
};

/** Hero — 다음 섹션으로 부드럽게 스크롤 */
export function HeroScrollButton({ targetId = MAGIC_SECTIONS.experience.id }: Props) {
  const scrollToTarget = () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="intro-hero__cta--scroll">
      <button
        type="button"
        className="intro-hero__scroll-btn border-0 shadow-none outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 before:content-none before:hidden after:content-none after:hidden"
        onClick={scrollToTarget}
        aria-label="아래로 스크롤"
      >
        <span className="intro-hero__scroll-chevrons" aria-hidden>
          <ChevronDown className="intro-hero__scroll-chevron" strokeWidth={2.5} />
          <ChevronDown className="intro-hero__scroll-chevron" strokeWidth={2.5} />
          <ChevronDown className="intro-hero__scroll-chevron" strokeWidth={2.5} />
        </span>
      </button>
    </div>
  );
}
