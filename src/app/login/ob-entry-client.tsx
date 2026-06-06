"use client";

import Link from "next/link";
import { Fingerprint, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BulkFlowProgress } from "@/components/bulk/bulk-flow-progress";
import { usePingCenteredLayout } from "@/hooks/use-ping-centered-layout";
import { memberLoginEmailHref, signupJoinTypeHref } from "@/lib/auth-signup-flow";
import { shouldShowBulkFlowProgressOnLogin } from "@/lib/ping-bulk-flow-login-progress";
import {
  bulkFlowBackAriaLabel,
  navigateBulkFlowBack,
} from "@/lib/ping-bulk-flow-nav";
import { hasPendingBulkRecipients } from "@/lib/ping-bulk-session";
import {
  getPingFlowRoute,
  hasPingFromIndexSession,
  ROUTE_BULK_DIRECT,
  ROUTE_OBITUARY_THEN_BULK,
} from "@/lib/ping-flow-client";
import {
  AUTH_ENTRY_COPY,
  type AuthEntryCopy,
  type AuthEntryCopyKey,
} from "@/lib/ping-flow-step-copy";

function resolveEntryCopyKey(): AuthEntryCopyKey {
  try {
    const route = getPingFlowRoute();
    const hasBulk = hasPendingBulkRecipients();
    if (route === ROUTE_BULK_DIRECT || hasBulk) return "bulk";
    if (route === ROUTE_OBITUARY_THEN_BULK) return "obituaryThenBulk";
  } catch {
    /* noop */
  }
  if (hasPingFromIndexSession()) return "bulk";
  return "default";
}

function computeEntryCopy(): AuthEntryCopy {
  return AUTH_ENTRY_COPY[resolveEntryCopyKey()];
}

export default function ObEntryClient() {
  usePingCenteredLayout();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const kakaoSignupHref = useMemo(
    () => signupJoinTypeHref("kakao", nextParam),
    [nextParam],
  );
  const guestSignupHref = useMemo(
    () => signupJoinTypeHref("guest", nextParam),
    [nextParam],
  );
  const emailLoginHref = useMemo(
    () => memberLoginEmailHref(nextParam),
    [nextParam],
  );
  const emailSignupHref = useMemo(
    () => signupJoinTypeHref("email", nextParam),
    [nextParam],
  );

  const [copy, setCopy] = useState<AuthEntryCopy>(AUTH_ENTRY_COPY.default);
  const [showBulkProgress, setShowBulkProgress] = useState(false);

  useEffect(() => {
    setCopy(computeEntryCopy());
    setShowBulkProgress(shouldShowBulkFlowProgressOnLogin());
  }, [searchParams]);

  useEffect(() => {
    document.title = copy.docTitle;
  }, [copy.docTitle]);

  return (
    <div className="ping-shell ob-entry-shell flex min-h-0 flex-1 flex-col">
      <header className="ping-top-nav ping-top-nav--blend">
        {showBulkProgress ? (
          <button
            type="button"
            className="ping-top-nav__back ping-back-btn touch-manipulation"
            aria-label={bulkFlowBackAriaLabel(5)}
            onClick={() => navigateBulkFlowBack(5)}
          >
            <span className="ping-chevron-left" aria-hidden="true" />
          </button>
        ) : (
          <Link
            href="/"
            className="ping-top-nav__back ping-back-btn"
            aria-label="뒤로"
          >
            <span className="ping-chevron-left" aria-hidden="true" />
          </Link>
        )}
        <h1 id="ob-entry-page-title" className="ping-top-nav__title">
          {copy.navTitle}
        </h1>
      </header>

      {showBulkProgress ? <BulkFlowProgress currentStep={5} sticky /> : null}

      <main
        className="ping-main ping-main--tight-top flex-1 min-w-0"
        style={{ paddingTop: 12 }}
      >
        <div
          className="ob-entry-panel ping-bordered-panel flex min-w-0 max-w-full flex-col gap-3 p-5"
          aria-labelledby="ob-entry-page-title"
        >
          <div id="ob-entry-lead" className="ob-entry-lead-block ping-step-head ping-step-head--lead">
            <p className="ob-entry-lead-title ping-step-head__title">{copy.title}</p>
            <p className="ob-entry-lead-sub ping-step-head__sub">{copy.subtitle}</p>
          </div>

          <div className="ob-entry-stack min-w-0 max-w-full w-full">
            <Link
              id="ob-entry-kakao-login"
              href={kakaoSignupHref}
              className="member-login-kakao-btn touch-manipulation no-underline"
              aria-label="카카오싱크로 시작하기"
            >
              <span className="member-login-kakao-btn__icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M9 1.5C4.86 1.5 1.5 4.35 1.5 7.8c0 2.145 1.425 4.0125 3.5625 5.085L3.75 15.75l3.4875-2.2875c.675.1125 1.3875.1875 2.1375.1875 4.14 0 7.5-2.85 7.5-6.3S13.14 1.5 9 1.5Z"
                  />
                </svg>
              </span>
              3초만에 카카오싱크
            </Link>

            <Link
              id="ob-entry-guest-link"
              href={guestSignupHref}
              className="ob-entry-guest-btn touch-manipulation"
              aria-label={copy.guestAria}
            >
              <span className="ob-entry-guest-btn__icon" aria-hidden="true">
                <Fingerprint className="size-[18px]" strokeWidth={2.25} />
              </span>
              OTP로 비회원 로그인
            </Link>
          </div>

          <Link
            id="ob-entry-email-login-link"
            href={emailLoginHref}
            className="ob-entry-email-login-btn ping-btn-secondary w-full no-underline touch-manipulation"
            aria-label="이메일 로그인"
          >
            <span className="ob-entry-email-login-btn__icon" aria-hidden="true">
              <Mail className="size-[18px]" strokeWidth={2.25} />
            </span>
            이메일 로그인
          </Link>

          <p className="ob-entry-signup-row m-0 text-center text-sm text-[#6B7684]">
            아직 계정이 없으신가요?{" "}
            <Link
              id="ob-entry-signup-link"
              href={emailSignupHref}
              className="ping-link font-bold"
            >
              이메일로 회원가입
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
