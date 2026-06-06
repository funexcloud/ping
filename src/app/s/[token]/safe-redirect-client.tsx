"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { PingLoadingSpinner } from "@/components/ping-loading-spinner";

/** 보안 트랜지션을 보여줄 최소 시간(ms). "보호받는 링크"라는 시각적 증명. */
const SHIELD_MIN_MS = 600;

export default function SafeRedirectClient({
  destination,
  deceasedName,
}: {
  destination: string;
  deceasedName?: string;
}) {
  const [showFallback, setShowFallback] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("ping-recipient-page");
    }
    return () => {
      document.documentElement.classList.remove("ping-recipient-page");
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const go = window.setTimeout(() => {
      try {
        window.location.replace(destination);
      } catch {
        window.location.href = destination;
      }
    }, SHIELD_MIN_MS);

    const fallback = window.setTimeout(() => setShowFallback(true), SHIELD_MIN_MS + 2500);

    return () => {
      window.clearTimeout(go);
      window.clearTimeout(fallback);
    };
  }, [destination]);

  return (
    <div className="ping-recipient-shell bg-[var(--ping-surface,#fff)]">
      <div className="flex flex-col items-center gap-3">
        <ShieldCheck
          className="size-10 text-[var(--ping-primary,#3182f6)]"
          aria-hidden
        />
        <PingLoadingSpinner size="md" label="안전한 부고장 환경 구성 중" />
      </div>

      <div className="space-y-2">
        <p className="ping-recipient-title m-0">
          PING 보안 엔진이 안전한 부고장을 준비하고 있습니다
        </p>
        <p className="ping-recipient-body m-0">
          {deceasedName ? `故 ${deceasedName}님 ` : ""}부고를 안전하게 확인하실 수
          있도록 검증하고 있어요.
        </p>
      </div>

      {showFallback ? (
        <a href={destination} className="ping-recipient-cta">
          부고 확인하기
        </a>
      ) : null}
    </div>
  );
}
