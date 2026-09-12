"use client";

import Link from "next/link";
import { Fingerprint, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BulkFlowProgress } from "@/components/bulk/bulk-flow-progress";
import { PingBrandLogo } from "@/components/brand/ping-brand-logo";
import { usePingCenteredLayout } from "@/hooks/use-ping-centered-layout";
import { memberLoginEmailHref, signupJoinTypeHref } from "@/lib/auth-signup-flow";
import { pingTrack } from "@/lib/ping-analytics";
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
import { sanitizeFunexReturnTo } from "@/lib/funex-return-to";

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

function GoogleMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function ObEntryClient() {
  usePingCenteredLayout();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const loginError = searchParams.get("error");

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
  const googleHref = useMemo(() => {
    const dest = sanitizeFunexReturnTo(nextParam);
    return `/api/auth/funex/start?returnTo=${encodeURIComponent(dest)}`;
  }, [nextParam]);

  const [copy, setCopy] = useState<AuthEntryCopy>(AUTH_ENTRY_COPY.default);
  const [showBulkProgress, setShowBulkProgress] = useState(false);

  useEffect(() => {
    setCopy(computeEntryCopy());
    setShowBulkProgress(shouldShowBulkFlowProgressOnLogin());
  }, [searchParams]);

  useEffect(() => {
    document.title = "PING · 로그인";
  }, []);

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
          로그인
        </h1>
      </header>

      {showBulkProgress ? <BulkFlowProgress currentStep={5} sticky /> : null}

      <main
        className="ping-main ping-main--tight-top flex-1 min-w-0"
        style={{ paddingTop: 12 }}
      >
        <div
          className="ob-entry-panel ping-bordered-panel flex min-w-0 max-w-full flex-col gap-4"
          aria-labelledby="ob-entry-page-title"
        >
          <div className="flex flex-col items-center gap-3 pt-2">
            <PingBrandLogo variant="horizontal" />
            <div className="text-center">
              <p className="m-0 text-[22px] font-extrabold tracking-[-0.03em] text-[#191f28]">
                PING에 로그인
              </p>
              <p className="mt-1 m-0 text-sm leading-6 text-[#6B7684]">
                {copy.subtitle}
              </p>
            </div>
          </div>

          {loginError === "funex_sso" ? (
            <p className="m-0 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600" role="alert">
              Google 로그인을 완료하지 못했습니다. 다시 시도해 주세요.
            </p>
          ) : null}

          <a
            id="ob-entry-funex-google"
            href={googleHref}
            className="ob-entry-email-login-btn ping-btn-primary ping-mobile-cta w-full no-underline touch-manipulation"
            aria-label="Google로 계속하기"
            onClick={() => pingTrack("google_login_start")}
          >
            <span className="ob-entry-email-login-btn__icon" aria-hidden="true">
              <GoogleMark />
            </span>
            Google로 계속하기
          </a>

          <details className="mt-1">
            <summary className="cursor-pointer list-none text-center text-sm font-semibold text-[#6B7684]">
              다른 방법으로 로그인
            </summary>
            <div className="ob-entry-stack mt-3 min-w-0 max-w-full w-full">
              <Link
                id="ob-entry-email-login-link"
                href={emailLoginHref}
                className="ob-entry-email-login-btn ob-entry-guest-btn w-full no-underline touch-manipulation"
                aria-label="이메일 회원 로그인"
              >
                <span className="ob-entry-email-login-btn__icon" aria-hidden="true">
                  <Mail className="size-[18px]" strokeWidth={2.25} />
                </span>
                이메일 회원 로그인
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
                OTP 비회원 로그인
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
          </details>
        </div>
      </main>
    </div>
  );
}
