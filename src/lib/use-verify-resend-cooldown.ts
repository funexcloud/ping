"use client";

import { useCallback, useEffect, useState } from "react";

/** 인증 메일 재발송 버튼 쿨다운(초) — 서버 `retryAfterSec` / `nextResendAfterSec` 와 동기화 */
export function useVerifyResendCooldown() {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    if (sec <= 0) return;
    const id = window.setInterval(() => {
      setSec((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [sec > 0]);

  const start = useCallback((seconds: number) => {
    const n = Math.max(0, Math.ceil(Number(seconds) || 0));
    if (n > 0) setSec(n);
  }, []);

  const blocked = sec > 0;

  return { sec, start, blocked };
}

export function formatResendButtonLabel(sec: number, busy: boolean): string {
  if (busy) return "보내는 중…";
  if (sec > 0) return `${sec}초 후 다시 보내기`;
  return "인증 메일 다시 보내기";
}
