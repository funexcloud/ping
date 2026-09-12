"use client";

import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const BOTTOM_THRESHOLD_PX = 140;
const MIN_SCROLL_PX = 320;

/** 랜딩 — 페이지 하단 근처에서 맨 위로 스크롤 */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateVisibility = useCallback(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - BOTTOM_THRESHOLD_PX;
    setVisible(nearBottom && scrollTop >= MIN_SCROLL_PX);
  }, []);

  useEffect(() => {
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [updateVisibility]);

  const scrollToTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  if (!mounted) return null;

  return createPortal(
    <button
      type="button"
      className={cn("ping-scroll-to-top", visible && "ping-scroll-to-top--visible")}
      onClick={scrollToTop}
      aria-label="맨 위로"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <ChevronUp aria-hidden strokeWidth={2.25} />
    </button>,
    document.body,
  );
}
