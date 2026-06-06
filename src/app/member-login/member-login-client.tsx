"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { KakaoMemberLoginButton } from "@/components/kakao-member-login-button";
import { PingLoadingSpinner } from "@/components/ping-loading-spinner";
import { usePingCenteredLayout } from "@/hooks/use-ping-centered-layout";
import { runAfterMemberLoginSuccess } from "@/lib/auth-redirect";
import { AUTH_KAKAO_MEMBER_LOGIN_COPY } from "@/lib/ping-flow-step-copy";
import { useKakaoMemberLogin } from "@/lib/use-kakao-member-login";

import { MemberLoginEmailLegacy } from "./member-login-email-legacy";

export default function MemberLoginClient() {
  usePingCenteredLayout();
  const searchParams = useSearchParams();
  const fullQuery = useMemo(() => {
    const s = searchParams.toString();
    return s ? `?${s}` : "";
  }, [searchParams]);

  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (searchParams.get("from") !== "entry") {
      window.location.replace(`/login${fullQuery}`);
      return;
    }
    setAllowed(true);
  }, [searchParams, fullQuery]);

  const nextParam = searchParams.get("next");
  const registered = searchParams.get("registered") === "1";
  const emailVerified = searchParams.get("verified") === "1";
  const useEmailLogin =
    searchParams.get("method") === "email" || emailVerified || registered;

  const returnPath = useMemo(() => {
    const p = new URLSearchParams();
    p.set("from", "entry");
    if (nextParam) p.set("next", nextParam);
    if (useEmailLogin) p.set("method", "email");
    if (emailVerified) p.set("verified", "1");
    if (registered) p.set("registered", "1");
    return `/member-login?${p.toString()}`;
  }, [emailVerified, nextParam, registered, useEmailLogin]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showVerifyResend, setShowVerifyResend] = useState(false);
  const phaseRef = useRef<"idle" | "submitting" | "success" | "error">("idle");

  const initialMemberId = useMemo(
    () => (searchParams.get("email") || "").trim(),
    [searchParams],
  );

  const { formError: kakaoFormError, kakaoBusy, kakaoExchangeBusy, onKakaoLoginClick } =
    useKakaoMemberLogin({
      nextParam,
      returnPath,
      enabled: allowed && !useEmailLogin,
    });

  useEffect(() => {
    if (!allowed) return;
    try {
      if (sessionStorage.getItem("ping_from_index")) {
        document.title = "PING · 발송 신청 계속";
        return;
      }
    } catch {
      /* noop */
    }
    document.title = useEmailLogin
      ? "PING · 회원 로그인"
      : AUTH_KAKAO_MEMBER_LOGIN_COPY.docTitle || "PING · 회원 로그인";
  }, [allowed, useEmailLogin]);

  function onEmailLoginSuccess(token: string, user: unknown) {
    sessionStorage.setItem("ping_auth_token", token);
    sessionStorage.setItem("ping_auth_user", JSON.stringify(user));
    runAfterMemberLoginSuccess(nextParam);
  }

  if (!allowed) {
    return (
      <div className="font-ping flex min-h-dvh w-full max-w-[400px] items-center justify-center bg-ping-bg text-sm text-ping-muted">
        이동 중…
      </div>
    );
  }

  if (!useEmailLogin && kakaoExchangeBusy) {
    return (
      <div className="font-ping flex min-h-dvh w-full max-w-[400px] flex-col items-center justify-center bg-ping-bg">
        <PingLoadingSpinner label="카카오싱크 확인 중" />
      </div>
    );
  }

  return (
    <div className="ping-shell ob-entry-shell flex min-h-0 flex-1 flex-col">
      <header className="ping-top-nav ping-top-nav--blend">
        <Link
          href="/login"
          className="ping-top-nav__back ping-back-btn"
          aria-label="뒤로"
        >
          <span className="ping-chevron-left" aria-hidden="true" />
        </Link>
        <h1 id="member-login-page-title" className="ping-top-nav__title">
          회원 로그인
        </h1>
      </header>

      <main
        className="ping-main ping-main--tight-top flex-1 min-w-0"
        style={{ paddingTop: 12 }}
      >
        {useEmailLogin ? (
          <MemberLoginEmailLegacy
            fullQuery={fullQuery}
            registered={registered}
            emailVerified={emailVerified}
            initialMemberId={initialMemberId}
            submitting={submitting}
            setSubmitting={setSubmitting}
            formError={formError}
            setFormError={setFormError}
            showVerifyResend={showVerifyResend}
            setShowVerifyResend={setShowVerifyResend}
            phaseRef={phaseRef}
            onLoginSuccess={onEmailLoginSuccess}
          />
        ) : (
          <>
            <div
              className="member-login-panel ping-bordered-panel flex min-w-0 max-w-full flex-col gap-4 p-5"
              aria-labelledby="member-login-page-title"
            >
              <div
                id="member-login-lead"
                className="member-login-lead-block ping-step-head ping-step-head--lead"
              >
                <p className="member-login-lead ping-step-head__title m-0">
                  {AUTH_KAKAO_MEMBER_LOGIN_COPY.title}
                </p>
                <p className="member-login-lead-sub ping-step-head__sub m-0">
                  {AUTH_KAKAO_MEMBER_LOGIN_COPY.subtitle}
                </p>
              </div>

              <p className="member-login-kakao-note m-0 text-sm text-ping-muted">
                카카오싱크로 간편 가입·로그인합니다. 동의한 정보(닉네임·이메일·휴대폰
                등)만 서비스에 저장됩니다.
              </p>
            </div>

            <div className="member-login-actions min-w-0 max-w-full">
              <KakaoMemberLoginButton busy={kakaoBusy} onClick={onKakaoLoginClick} />
            </div>

            {kakaoFormError ? (
              <div id="formError" className="ping-alert--error" role="alert">
                {kakaoFormError}
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
