"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

/** 스크롤 시 상단 헤더 배경·테두리 — 본문은 서버 컴포넌트 유지 */
export function OverviewStickyHeader({ children }: { children: ReactNode }) {
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "sticky top-0 z-40 border-b border-transparent pt-[env(safe-area-inset-top,0px)] transition-[border-color,background-color] duration-200",
        navScrolled && "border-[#eaeaea] bg-[#f5f7fb]/95 backdrop-blur-[14px]",
      )}
    >
      {children}
    </div>
  );
}
