"use client";

import { useEffect } from "react";

/** 인트로 전용 전역 배경·토큰 — 언마운트 시 제거 */
export function IntroHtmlClass(): null {
  useEffect(() => {
    document.documentElement.classList.add("ping-intro-active");
    return () => document.documentElement.classList.remove("ping-intro-active");
  }, []);
  return null;
}
