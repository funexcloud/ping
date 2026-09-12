"use client";

import { useState } from "react";

import {
  isPingDevFlowSkipEnabled,
  pingDevGoIdentityHref,
  pingDevIdentityNextHref,
  pingDevIdentityPrevHref,
} from "@/lib/ping-dev-flow-skip";
import { pingDevLoginAndContinue } from "@/lib/ping-dev-login";

const skipBtnClass =
  "touch-manipulation rounded-full border border-[#f0c14b] bg-[#fff8e1] px-3.5 py-2 text-[12px] font-bold tracking-tight text-[#7a5b00] disabled:opacity-60";

export function PingDevFlowSkipButton({
  onNext,
  onPrev,
  onLogin,
  loginBusy = false,
  elevated = false,
}: {
  onNext?: () => void;
  onPrev?: () => void;
  onLogin?: () => void;
  loginBusy?: boolean;
  /** 하단 실제 CTA와 겹치지 않게 올림 */
  elevated?: boolean;
}) {
  if (!isPingDevFlowSkipEnabled()) return null;

  const bottom = elevated
    ? "max(6.25rem, calc(env(safe-area-inset-bottom, 0px) + 5.25rem))"
    : "max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))";

  return (
    <div
      className="fixed right-[max(1rem,env(safe-area-inset-right))] z-[200] flex flex-wrap justify-end gap-2"
      style={{ bottom }}
    >
      {onLogin ? (
        <button
          type="button"
          onClick={onLogin}
          disabled={loginBusy}
          className={skipBtnClass}
          aria-label="개발용 로그인"
        >
          {loginBusy ? "개발 · 로그인 중" : "개발 · 로그인"}
        </button>
      ) : null}
      {onPrev ? (
        <button
          type="button"
          onClick={onPrev}
          disabled={loginBusy}
          className={skipBtnClass}
          aria-label="개발용 이전 화면"
        >
          개발 · 이전
        </button>
      ) : null}
      {onNext ? (
        <button
          type="button"
          onClick={onNext}
          disabled={loginBusy}
          className={skipBtnClass}
          aria-label="개발용 다음 화면"
        >
          개발 · 다음
        </button>
      ) : null}
    </div>
  );
}

/** 본인확인~결제완료 · 디지털 방명록 구간 — 경로만 넘기면 됨 */
export function PingDevIdentitySkipBar({ elevated = false }: { elevated?: boolean }) {
  const [loginBusy, setLoginBusy] = useState(false);
  if (!isPingDevFlowSkipEnabled()) return null;

  async function onLogin() {
    if (loginBusy) return;
    setLoginBusy(true);
    try {
      await pingDevLoginAndContinue();
    } finally {
      setLoginBusy(false);
    }
  }

  return (
    <PingDevFlowSkipButton
      elevated={elevated}
      loginBusy={loginBusy}
      onLogin={() => {
        void onLogin();
      }}
      onPrev={() => {
        const href = pingDevIdentityPrevHref();
        if (href) pingDevGoIdentityHref(href);
      }}
      onNext={() => {
        const href = pingDevIdentityNextHref();
        if (href) pingDevGoIdentityHref(href);
      }}
    />
  );
}
