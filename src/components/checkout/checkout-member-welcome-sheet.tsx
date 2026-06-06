"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  PING_MEMBER_WELCOME_GIFT_WON,
  PING_MEMBER_WELCOME_POINTS,
  claimMemberWelcomeBonus,
  clearCheckoutWelcomePending,
  isCheckoutWelcomePending,
  readMemberIdFromSession,
} from "@/lib/ping-member-welcome-bonus";
import { getOrCreateVisitorId } from "@/lib/ping-referral-client";

type SheetPhase = "hidden" | "entering" | "open" | "leaving";

type Props = {
  /** checkout init·referral 스크립트 준비 후 true */
  active: boolean;
};

export function CheckoutMemberWelcomeSheet({ active }: Props) {
  const [phase, setPhase] = useState<SheetPhase>("hidden");
  const [mounted, setMounted] = useState(false);
  const claimStartedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeSheet = useCallback(() => {
    setPhase((p) => (p === "hidden" ? p : "leaving"));
    window.setTimeout(() => setPhase("hidden"), 380);
  }, []);

  useEffect(() => {
    if (!active) {
      claimStartedRef.current = false;
      return;
    }
    if (claimStartedRef.current) return;

    const memberId = readMemberIdFromSession();
    if (!memberId) return;

    claimStartedRef.current = true;
    let cancelled = false;

    void (async () => {
      const deviceId = getOrCreateVisitorId();
      if (!deviceId) {
        claimStartedRef.current = false;
        return;
      }

      const result = await claimMemberWelcomeBonus({ memberId, deviceId });
      if (cancelled) return;

      if (isCheckoutWelcomePending()) {
        clearCheckoutWelcomePending();
      }

      if (!result.ok) {
        claimStartedRef.current = false;
        return;
      }

      if (result.alreadyClaimed || !(result.added && result.added > 0)) {
        return;
      }

      try {
        window.dispatchEvent(new CustomEvent("ping:checkout-reload-points"));
      } catch {
        /* noop */
      }

      setPhase("entering");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setPhase("open");
        });
      });
    })();

    return () => {
      cancelled = true;
      claimStartedRef.current = false;
    };
  }, [active]);

  if (!mounted || phase === "hidden") return null;

  const open = phase === "open" || phase === "entering";

  const sheet = (
    <div
      className={`checkout-welcome-sheet-root${open ? " is-open" : ""}${phase === "leaving" ? " is-leaving" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-welcome-sheet-title"
    >
      <button
        type="button"
        className="checkout-welcome-sheet-overlay"
        aria-label="닫기"
        onClick={closeSheet}
      />
      <div className="checkout-welcome-sheet-panel">
        <div className="checkout-welcome-sheet-handle" aria-hidden="true" />
        <p className="checkout-welcome-sheet-badge m-0">회원 가입 혜택</p>
        <h2 id="checkout-welcome-sheet-title" className="checkout-welcome-sheet-title m-0">
          <span className="checkout-welcome-sheet-points">
            {PING_MEMBER_WELCOME_POINTS}건
          </span>{" "}
          보낼 수 있어요
        </h2>
        <p className="checkout-welcome-sheet-sub m-0">
          1P = 1원 · 문자 발송에 바로 쓸 수 있는{" "}
          <strong>{PING_MEMBER_WELCOME_POINTS}P</strong>를 드렸어요.
        </p>
        <p className="checkout-welcome-sheet-gift m-0">
          {PING_MEMBER_WELCOME_GIFT_WON.toLocaleString("ko-KR")}원 증정
        </p>
        <button
          type="button"
          className="checkout-welcome-sheet-cta ob-flow-btn-primary w-full touch-manipulation"
          onClick={closeSheet}
        >
          확인했어요
        </button>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
